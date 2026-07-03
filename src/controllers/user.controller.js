const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

const { messages, errors } = require("../utils/messages");
const userService = require("../services/user.service");
const { createAuditLog } = require("../utils/audit");

// ================= HELPER =================
const getIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : req.ip;
};

// ================= GET USERS =================
exports.getUsers = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: errors.FORBIDDEN,
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "page ต้องมากกว่า 0",
      });
    }

    const skip = (page - 1) * limit;
    const { search, role, sort, order } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) where.role = role;

    const allowedSort = ["created_at", "name", "email"];
    const sortField = allowedSort.includes(sort) ? sort : "created_at";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const [users, totalItems] = await Promise.all([
      userService.getUsers({
        skip,
        limit,
        where,
        orderBy: { [sortField]: sortOrder },
      }),
      userService.countUsers(where),
    ]);

    createAuditLog({
      userId: req.user.id,
      action: "ADMIN_VIEW_USERS",
      ip: getIP(req),
      req,
      meta: {
        page,
        limit,
        search,
        role,
      },
    });

    return res.json({
      success: true,
      message: "ดึงข้อมูลผู้ใช้สำเร็จ",
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems,
          itemsPerPage: limit,
        },
      },
    });

  } catch (err) {
    next(err);
  }
};

// ================= GET USER BY ID =================
exports.getUserById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "id ต้องเป็นตัวเลข",
      });
    }

    if (req.user.role !== "admin" && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: errors.FORBIDDEN,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: errors.NOT_FOUND,
      });
    }

    createAuditLog({
      userId: req.user.id,
      targetId: id,
      action: "VIEW_USER_DETAIL",
      ip: getIP(req),
      req,
    });

    return res.json({
      success: true,
      message: messages.FETCHED,
      data: user,
    });

  } catch (err) {
    next(err);
  }
};

// ================= UPDATE USER =================
exports.updateUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "id ต้องเป็นตัวเลข",
      });
    }

    if (req.user.role !== "admin" && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: errors.FORBIDDEN,
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: errors.NOT_FOUND,
      });
    }

    const { name, password } = req.body;
    const data = {};

    if (name) {
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({
          success: false,
          message: errors.VALIDATION_FAILED,
          errors: [{ field: "name", message: "ชื่อต้องมีความยาว 2-100 ตัวอักษร" }],
        });
      }
      data.name = name.trim();
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: errors.VALIDATION_FAILED,
          errors: [{ field: "password", message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }],
        });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "ไม่มีข้อมูลสำหรับอัปเดต",
      });
    }

    // 🔥 before
    const before = {
      name: existingUser.name,
    };

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
      },
    });

    // 🔥 after
    const after = {
      name: updatedUser.name,
    };

    createAuditLog({
      userId: req.user.id,
      targetId: id,
      action: req.user.role === "admin"
        ? "ADMIN_UPDATE_USER"
        : "USER_UPDATE_PROFILE",
      ip: getIP(req),
      req,
      before,
      after,
    });

    return res.json({
      success: true,
      message: messages.UPDATED,
      data: updatedUser,
    });

  } catch (err) {
    next(err);
  }
};

// ================= DELETE USER =================
exports.deleteUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "id ต้องเป็นตัวเลข",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: errors.FORBIDDEN,
      });
    }

    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถลบบัญชีตัวเองได้",
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: errors.NOT_FOUND,
      });
    }

    await prisma.user.delete({ where: { id } });

    createAuditLog({
      userId: req.user.id,
      targetId: id,
      action: "ADMIN_DELETE_USER",
      ip: getIP(req),
      req,
      meta: {
        deletedEmail: user.email,
      },
    });

    return res.json({
      success: true,
      message: messages.DELETED,
    });

  } catch (err) {
    next(err);
  }
};

// ================= TOGGLE STATUS =================
exports.updateStatus = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "id ต้องเป็นตัวเลข",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: errors.FORBIDDEN,
      });
    }

    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถเปลี่ยนสถานะตัวเองได้",
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: errors.NOT_FOUND,
      });
    }

    const before = { is_active: user.is_active };

    const updated = await prisma.user.update({
      where: { id },
      data: { is_active: !user.is_active },
      select: { id: true, is_active: true },
    });

    const after = { is_active: updated.is_active };

    createAuditLog({
      userId: req.user.id,
      targetId: id,
      action: "ADMIN_TOGGLE_USER_STATUS",
      ip: getIP(req),
      req,
      before,
      after,
    });

    return res.json({
      success: true,
      message: messages.UPDATED,
      data: updated,
    });

  } catch (err) {
    next(err);
  }
};

// ================= CREATE USER (ADMIN) =================
exports.createUser = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: errors.FORBIDDEN,
      });
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: errors.VALIDATION_FAILED,
      });
    }

    // normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // validate name
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: errors.VALIDATION_FAILED,
        errors: [
          { field: "name", message: "ชื่อต้องมีความยาว 2-100 ตัวอักษร" },
        ],
      });
    }

    // validate password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: errors.VALIDATION_FAILED,
        errors: [
          { field: "password", message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
        ],
      });
    }

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
        role: role || "user",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
      },
    });

    // ✅ audit (สำคัญมาก)
    createAuditLog({
      userId: req.user.id,
      targetId: user.id,
      action: "ADMIN_CREATE_USER",
      ip: getIP(req),
      req,
      meta: {
        email: user.email,
        role: user.role,
      },
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