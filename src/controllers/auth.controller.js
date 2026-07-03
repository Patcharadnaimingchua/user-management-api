const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const { messages, errors } = require("../utils/messages");
const { validateRegister } = require("../utils/validate");
const { createAuditLog } = require("../utils/audit");

// ================= HELPER =================
const getIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : req.ip;
};

// ================= REGISTER =================
exports.register = async (req, res, next) => {
  try {
    const validationErrors = validateRegister(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.VALIDATION_FAILED,
        errors: validationErrors,
      });
    }

    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: errors.EMAIL_ALREADY_EXISTS,
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        role: "user",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    createAuditLog({
      userId: user.id,
      targetId: user.id,
      action: "USER_REGISTER",
      ip: getIP(req),
      req,
    });

    return res.status(201).json({
      success: true,
      message: messages.CREATED,
      data: user,
    });

  } catch (err) {
    next(err);
  }
};

// ================= LOGIN =================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: errors.VALIDATION_FAILED,
        errors: [
          !email && { field: "email", message: "กรุณากรอกอีเมล" },
          !password && { field: "password", message: "กรุณากรอกรหัสผ่าน" },
        ].filter(Boolean),
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      createAuditLog({
        action: "LOGIN_FAILED",
        ip: getIP(req),
        req,
        meta: { email: normalizedEmail, reason: "user_not_found" },
      });

      return res.status(401).json({
        success: false,
        message: errors.INVALID_CREDENTIALS,
      });
    }

    if (!user.is_active) {
      createAuditLog({
        userId: user.id,
        targetId: user.id,
        action: "LOGIN_BLOCKED",
        ip: getIP(req),
        req,
      });

      return res.status(403).json({
        success: false,
        message: errors.ACCOUNT_DISABLED,
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      createAuditLog({
        userId: user.id,
        targetId: user.id,
        action: "LOGIN_FAILED",
        ip: getIP(req),
        req,
        meta: { reason: "wrong_password" },
      });

      return res.status(401).json({
        success: false,
        message: errors.INVALID_CREDENTIALS,
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role, type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, type: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });

    createAuditLog({
      userId: user.id,
      targetId: user.id,
      action: "USER_LOGIN",
      ip: getIP(req),
      req,
    });

    return res.json({
      success: true,
      message: messages.LOGIN_SUCCESS,
      accessToken,
      refreshToken,
    });

  } catch (err) {
    next(err);
  }
};

// ================= ME =================
exports.me = async (req, res) => {
  return res.json({
    success: true,
    message: messages.FETCHED,
    data: req.user,
  });
};

// ================= REFRESH =================
exports.refresh = async (req, res, next) => {
  try {
    let { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: errors.MISSING_REFRESH_TOKEN,
      });
    }

    refreshToken = refreshToken.trim();

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: errors.INVALID_REFRESH_TOKEN,
      });
    }

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: errors.INVALID_TOKEN_TYPE,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.is_active || user.refresh_token !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: errors.INVALID_REFRESH_TOKEN,
      });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role, type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, role: user.role, type: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: newRefreshToken },
    });

    createAuditLog({
      userId: user.id,
      targetId: user.id,
      action: "REFRESH_TOKEN",
      ip: getIP(req),
      req,
    });

    return res.json({
      success: true,
      message: messages.REFRESH_SUCCESS,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (err) {
    next(err);
  }
};

// ================= LOGOUT =================
exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: errors.UNAUTHORIZED,
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: errors.INVALID_TOKEN,
      });
    }

    await prisma.blacklistToken.create({
      data: {
        token,
        expired_at: new Date(decoded.exp * 1000),
      },
    });

    await prisma.user.update({
      where: { id: decoded.id },
      data: { refresh_token: null },
    });

    createAuditLog({
      userId: decoded.id,
      targetId: decoded.id,
      action: "USER_LOGOUT",
      ip: getIP(req),
      req,
    });

    return res.json({
      success: true,
      message: messages.LOGOUT_SUCCESS,
    });

  } catch (err) {
    next(err);
  }
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: errors.VALIDATION_FAILED,
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: errors.VALIDATION_FAILED,
        errors: [
          {
            field: "newPassword",
            message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร",
          },
        ],
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: errors.NOT_FOUND,
      });
    }

    const match = await bcrypt.compare(oldPassword, user.password);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านเดิมไม่ถูกต้อง",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    createAuditLog({
      userId: user.id,
      targetId: user.id,
      action: "CHANGE_PASSWORD",
      ip: getIP(req),
      req,
    });

    return res.json({
      success: true,
      message: messages.UPDATED,
    });

  } catch (err) {
    next(err);
  }
};