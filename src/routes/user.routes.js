const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth");
const { errors } = require("../utils/messages");

// admin middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: errors.FORBIDDEN,
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: จัดการผู้ใช้งาน (User Management)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: ดึงรายการผู้ใช้ทั้งหมด (Admin เท่านั้น)
 *     tags: [Users]
 *     description: |
 *       ใช้สำหรับดูรายการ user ทั้งหมดในระบบ (เฉพาะ admin)
 *
 *       รองรับ:
 *       - pagination
 *       - search (name, email)
 *       - filter role
 *       - sort
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: john
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           example: admin
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           example: desc
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: ดึงข้อมูลผู้ใช้สำเร็จ
 *               data:
 *                 users:
 *                   - id: 1
 *                     name: John
 *                     email: john@example.com
 *                     role: user
 *                     is_active: true
 *                 pagination:
 *                   currentPage: 1
 *                   totalPages: 1
 *                   totalItems: 1
 *                   itemsPerPage: 10
 *       401:
 *         description: ไม่ได้ login
 *       403:
 *         description: ไม่ใช่ admin
 */
router.get("/", authMiddleware, isAdmin, userController.getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: ดึงข้อมูลผู้ใช้รายบุคคล
 *     tags: [Users]
 *     description: Admin หรือเจ้าของ account เท่านั้นที่ดูได้
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *                 name: John
 *                 email: john@example.com
 *                 role: user
 *       401:
 *         description: ไม่ได้ login
 *       403:
 *         description: ไม่มีสิทธิ์
 *       404:
 *         description: ไม่พบ user
 */
router.get("/:id", authMiddleware, userController.getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: อัปเดตข้อมูลผู้ใช้
 *     tags: [Users]
 *     description: Admin หรือเจ้าของ account เท่านั้น
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           example:
 *             name: "John Doe"
 *             password: "abc12345"
 *     responses:
 *       200:
 *         description: อัปเดตสำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: อัปเดตสำเร็จ
 *               data:
 *                 id: 1
 *                 name: John Doe
 *       400:
 *         description: validation failed
 *       401:
 *         description: ไม่ได้ login
 *       403:
 *         description: ไม่มีสิทธิ์
 *       404:
 *         description: ไม่พบ user
 */
router.put("/:id", authMiddleware, userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: ลบผู้ใช้ (Admin เท่านั้น)
 *     tags: [Users]
 *     description: admin เท่านั้น และห้ามลบตัวเอง
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ลบสำเร็จ
 *       401:
 *         description: ไม่ได้ login
 *       403:
 *         description: ไม่ใช่ admin
 *       404:
 *         description: ไม่พบ user
 */
router.delete("/:id", authMiddleware, isAdmin, userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: เปิด/ปิดการใช้งานผู้ใช้ (Admin เท่านั้น)
 *     tags: [Users]
 *     description: toggle is_active ของ user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: อัปเดตสำเร็จ
 *               data:
 *                 id: 1
 *                 is_active: false
 *       401:
 *         description: ไม่ได้ login
 *       403:
 *         description: ไม่มีสิทธิ์
 *       404:
 *         description: ไม่พบ user
 */
router.patch("/:id/status", authMiddleware, isAdmin, userController.updateStatus);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: สร้างผู้ใช้ (Admin เท่านั้น)
 *     tags: [Users]
 *     description: admin สามารถสร้าง user ใหม่ได้
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Jane Doe"
 *             email: "jane@example.com"
 *             password: "12345678"
 *             role: "user"
 *     responses:
 *       201:
 *         description: สร้างสำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: สร้างข้อมูลสำเร็จ
 *               data:
 *                 id: 2
 *                 name: Jane Doe
 *                 email: jane@example.com
 *                 role: user
 *       400:
 *         description: validation failed
 *       401:
 *         description: ไม่ได้ login
 *       403:
 *         description: ไม่ใช่ admin
 *       409:
 *         description: email ซ้ำ
 */
router.post("/", authMiddleware, isAdmin, userController.createUser);


module.exports = router;