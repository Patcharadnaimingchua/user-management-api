const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth");
const { loginLimiter } = require("../middlewares/rateLimit");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: ระบบยืนยันตัวตน (Authentication)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: สมัครสมาชิก
 *     tags: [Auth]
 *     description: สร้างบัญชีผู้ใช้ใหม่ในระบบ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "John Doe"
 *             email: "john@example.com"
 *             password: "abc12345"
 *     responses:
 *       201:
 *         description: สมัครสำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: สมัครสำเร็จ
 *               data:
 *                 id: 1
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *                 role: "user"
 *       400:
 *         description: validation error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Validation failed
 *               errors:
 *                 - field: email
 *                   message: รูปแบบอีเมลไม่ถูกต้อง
 *       409:
 *         description: email ซ้ำ
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: เข้าสู่ระบบ
 *     tags: [Auth]
 *     description: รับ accessToken และ refreshToken หลัง login สำเร็จ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "john@example.com"
 *             password: "abc12345"
 *     responses:
 *       200:
 *         description: เข้าสำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: เข้าสำเร็จ
 *               accessToken: "jwt-access-token"
 *               refreshToken: "jwt-refresh-token"
 *       400:
 *         description: ไม่กรอก email/password
 *       401:
 *         description: อีเมลหรือรหัสผ่านไม่ถูกต้อง
 *       403:
 *         description: account ถูกปิด
 *       429:
 *         description: rate limit (ลองใหม่ภายหลัง)
 */
router.post("/login", loginLimiter, authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: ออกจากระบบ
 *     tags: [Auth]
 *     description: logout และ blacklist access token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ออกจากระบบสำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: ออกจากระบบสำเร็จ
 *       401:
 *         description: ไม่มี token หรือ token ไม่ถูกต้อง
 */
router.post("/logout", authMiddleware, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: ดูข้อมูลผู้ใช้ปัจจุบัน
 *     tags: [Auth]
 *     description: ใช้ accessToken เพื่อดึงข้อมูล user ปัจจุบัน
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: สำเร็จ
 *               data:
 *                 id: 1
 *                 role: "admin"
 *       401:
 *         description: token ไม่ถูกต้อง
 */
router.get("/me", authMiddleware, authController.me);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: ต่ออายุ access token
 *     tags: [Auth]
 *     description: ใช้ refreshToken เพื่อออก accessToken ใหม่
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             refreshToken: "your-refresh-token"
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: ต่ออายุสำเร็จ
 *               accessToken: "new-access-token"
 *               refreshToken: "new-refresh-token"
 *       400:
 *         description: ไม่ส่ง refreshToken
 *       401:
 *         description: refreshToken ไม่ถูกต้อง
 */
router.post("/refresh", authController.refresh);


/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: เปลี่ยนรหัสผ่าน
 *     tags: [Auth]
 *     description: ผู้ใช้เปลี่ยนรหัสผ่านของตัวเอง
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             oldPassword: "12345678"
 *             newPassword: "newpassword123"
 *     responses:
 *       200:
 *         description: เปลี่ยนรหัสผ่านสำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: เปลี่ยนรหัสผ่านสำเร็จ
 *       400:
 *         description: รหัสผ่านเดิมไม่ถูกต้อง หรือข้อมูลไม่ครบ
 *       401:
 *         description: ไม่ได้ login
 */
router.put("/change-password", authMiddleware, authController.changePassword);
module.exports = router;