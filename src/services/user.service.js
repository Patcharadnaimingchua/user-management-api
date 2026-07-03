const prisma = require("../config/prisma");

exports.getUsers = async ({ skip = 0, limit = 10, where = {}, orderBy }) => {
  return prisma.user.findMany({
    where,
    skip,
    take: Math.min(limit, 100), // กัน limit เกิน
    orderBy: orderBy || { created_at: "desc" }, // fallback
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      created_at: true,
    },
  });
};

exports.countUsers = async (where = {}) => {
  return prisma.user.count({ where });
};