const prisma = require("../config/prisma");

// ================= HELPER =================
const getUserAgent = (req) => req?.headers?.["user-agent"] || null;

const getUserEmail = async (id) => {
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });

  return user?.email || null;
};

// ================= DIFF =================
const buildDiff = (before = {}, after = {}) => {
  const diff = {
    before: {},
    after: {},
    changedFields: [],
  };

  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  keys.forEach((key) => {
    if (before?.[key] !== after?.[key]) {
      diff.before[key] = before?.[key];
      diff.after[key] = after?.[key];
      diff.changedFields.push(key);
    }
  });

  return diff.changedFields.length ? diff : null;
};

// ================= MESSAGE =================
const buildMessage = ({ action, actor, target }) => {
  if (!actor) actor = "ระบบ";

  switch (action) {
    case "USER_LOGIN":
      return `${actor} เข้าสู่ระบบ`;

    case "USER_REGISTER":
      return `${actor} สมัครสมาชิก`;

    case "USER_LOGOUT":
      return `${actor} ออกจากระบบ`;

    case "ADMIN_VIEW_USERS":
      return `${actor} ดูรายการผู้ใช้`;

    case "VIEW_USER_DETAIL":
      return target
        ? `${actor} ดูข้อมูล ${target}`
        : `${actor} ดูข้อมูลผู้ใช้`;

    case "ADMIN_UPDATE_USER":
      return target
        ? `${actor} แก้ไขข้อมูล ${target}`
        : `${actor} แก้ไขผู้ใช้`;

    case "ADMIN_DELETE_USER":
      return target
        ? `${actor} ลบผู้ใช้ ${target}`
        : `${actor} ลบผู้ใช้`;

    case "ADMIN_TOGGLE_USER_STATUS":
      return target
        ? `${actor} เปลี่ยนสถานะ ${target}`
        : `${actor} เปลี่ยนสถานะผู้ใช้`;

    case "LOGIN_FAILED":
      return `${actor} พยายามเข้าสู่ระบบ (ล้มเหลว)`;

    case "LOGIN_BLOCKED":
      return `${actor} ถูกบล็อกการเข้าสู่ระบบ`;

    default:
      return `${actor} ทำรายการ (${action})`;
  }
};

// ================= CREATE AUDIT =================
const createAuditLog = async ({
  userId = null,
  targetId = null,
  action,
  ip = null,
  req = null,
  before = null,
  after = null,
  meta = {},
}) => {
  try {
    const [actorEmail, targetEmail] = await Promise.all([
      getUserEmail(userId),
      getUserEmail(targetId),
    ]);

    const actor = actorEmail || "ระบบ";
    const target = targetEmail || null;

    const diff = buildDiff(before, after);
    const message = buildMessage({ action, actor, target });

    const finalMeta = {
      ...(meta || {}),
      ...(diff && { diff }),
    };

    await prisma.auditLog.create({
      data: {
        userId,
        targetId,
        action,

        ipAddress: ip || null,
        userAgent: getUserAgent(req),

        message,
        meta: Object.keys(finalMeta).length ? finalMeta : null,
      },
    });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};

module.exports = { createAuditLog };