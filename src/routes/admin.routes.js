const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const adminController = require("../controllers/admin.controller");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: ฟีเจอร์สำหรับผู้ดูแลระบบ (Admin only)
 */

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: ดูประวัติการใช้งานระบบ (Audit Logs)
 *     tags: [Admin]
 *     description: |
 *       แสดง log การใช้งาน เช่น:
 *       - login / logout
 *       - ดู / แก้ไข / ลบ user
 *
 *       รองรับ:
 *       - pagination
 *       - filter (action, userId, targetId)
 *       - search email
 *       - sort
 *
 *       ตัวอย่าง:
 *       /api/admin/audit-logs?page=1&limit=10
 *       /api/admin/audit-logs?action=USER_LOGIN
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: admin@example.com
 *
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: USER_LOGIN
 *
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *           example: 1
 *
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: integer
 *           example: 5
 *
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at
 *
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           example: desc
 *
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: ดึงข้อมูล Audit Log สำเร็จ
 *               data:
 *                 logs:
 *                   - id: 1
 *                     actor: admin@example.com
 *                     target: user@example.com
 *                     targetId: 5
 *                     action: ADMIN_UPDATE_USER
 *                     message: "admin@example.com แก้ไขข้อมูล user@example.com"
 *                     type: warning
 *                     ip: "::ffff:127.0.0.1"
 *                     time: "30 มี.ค. 2569 03:10 น."
 *                 pagination:
 *                   currentPage: 1
 *                   totalPages: 1
 *                   totalItems: 1
 *                   itemsPerPage: 10
 *
 *       401:
 *         description: ไม่ได้ login / token ไม่ถูกต้อง
 *
 *       403:
 *         description: ไม่ใช่ admin
 */
router.get("/audit-logs", authMiddleware, adminController.getAuditLogs);

module.exports = router;