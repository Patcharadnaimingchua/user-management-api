const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { errors } = require("../utils/messages");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // ไม่มี token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: errors.UNAUTHORIZED,
      timestamp: new Date().toISOString(),
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // check blacklist
    const blacklisted = await prisma.blacklistToken.findFirst({
      where: { token },
      select: { id: true },
    });

    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: errors.INVALID_TOKEN,
        timestamp: new Date().toISOString(),
      });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // wrong token type
    if (decoded.type !== "access") {
      return res.status(401).json({
        success: false,
        message: errors.INVALID_TOKEN_TYPE,
        timestamp: new Date().toISOString(),
      });
    }

    // ดึง user แบบ minimal
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,   // 🔥 เพิ่มบรรทัดนี้
        role: true,
        is_active: true,
      },
    });

    // user หาย → token ไม่ valid
    if (!user) {
      return res.status(401).json({
        success: false,
        message: errors.INVALID_TOKEN,
        timestamp: new Date().toISOString(),
      });
    }

    // account disabled
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: errors.ACCOUNT_DISABLED,
        timestamp: new Date().toISOString(),
      });
    }

    // attach user
    req.user = user;

    next();

  } catch (err) {
    // token expired
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: errors.TOKEN_EXPIRED,
        timestamp: new Date().toISOString(),
      });
    }

    // invalid token
    return res.status(401).json({
      success: false,
      message: errors.INVALID_TOKEN,
      timestamp: new Date().toISOString(),
    });
  }
};