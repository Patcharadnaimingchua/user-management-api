const prisma = require("../config/prisma");

// ================= HELPER =================
const formatThaiDate = (date) => {
  return (
    new Date(date).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " น."
  );
};

// ================= TYPE =================
const getType = (action) => {
  if (["LOGIN_FAILED", "LOGIN_BLOCKED", "ADMIN_DELETE_USER"].includes(action))
    return "danger";

  if (["ADMIN_UPDATE_USER", "ADMIN_TOGGLE_USER_STATUS"].includes(action))
    return "warning";

  if (["USER_LOGIN", "USER_REGISTER"].includes(action))
    return "success";

  return "info";
};

// ================= CONTROLLER =================
exports.getAuditLogs = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const { search } = req.query;

    const where = {};

    // 🔥 search actor + target
    if (search) {
      where.OR = [
        {
          user: {
            is: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          target: {
            is: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [logs, totalItems] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          user: { select: { email: true } },
          target: { select: { email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      actor: log.user?.email || null,
      target: log.target?.email || null,
      message: log.message,
      action: log.action,
      type: getType(log.action),

      ip: log.ipAddress || "-",
      userAgent: log.userAgent || null,
      meta: log.meta || null,

      time: formatThaiDate(log.created_at),
    }));

    return res.json({
      success: true,
      data: {
        logs: formattedLogs,
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