const rateLimit = require("express-rate-limit");

const isTest = process.env.NODE_ENV === "test";
const isDev = process.env.NODE_ENV === "development";

// ================= GLOBAL LIMIT =================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 100,

  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "คุณส่ง request มากเกินไป กรุณาลองใหม่ภายหลัง",
      timestamp: new Date().toISOString(),
    });
  },
});

// ================= LOGIN LIMIT =================
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 5, // 🔥 ตรงนี้สำคัญ

  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
      timestamp: new Date().toISOString(),
    });
  },
});

module.exports = {
  apiLimiter,
  loginLimiter,
};