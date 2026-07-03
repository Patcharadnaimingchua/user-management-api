const request = require("supertest");
const app = require("../../src/server");

let counter = 0;

// สร้าง user ไม่ซ้ำ
exports.createUser = () => {
  counter++;
  return {
    name: "Test User",
    email: `test${Date.now()}_${counter}@example.com`,
    password: "abc12345",
  };
};

// register + login
exports.registerAndLogin = async (userData) => {
  const user = userData || exports.createUser();

  await request(app).post("/api/auth/register").send(user);

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send(user);

  return {
    ...user,
    accessToken: loginRes.body.accessToken,
    refreshToken: loginRes.body.refreshToken,
  };
};

// admin login (ใช้ seed)
exports.loginAdmin = async () => {
  const res = await request(app).post("/api/auth/login").send({
    email: "admin@example.com",
    password: "12345678",
  });

  return {
    accessToken: res.body.accessToken,
  };
};