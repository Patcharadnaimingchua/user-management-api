const request = require("supertest");
const app = require("../src/server");
const prisma = require("../src/config/prisma");

const createUser = () => ({
  name: "Test User",
  email: `test_${Date.now()}@example.com`,
  password: "Password123",
});

beforeAll(async () => {
  await prisma.blacklistToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("AUTH API (FULL)", () => {
  
  // ================= REGISTER =================
  it("register สำเร็จ", async () => {
    const user = createUser();

    const res = await request(app)
      .post("/api/auth/register")
      .send(user);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(user.email.toLowerCase());
  });

  it("register ซ้ำ", async () => {
    const user = createUser();

    await request(app).post("/api/auth/register").send(user);

    const res = await request(app)
      .post("/api/auth/register")
      .send(user);

    expect(res.statusCode).toBe(409);
  });

  it("register invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bad", password: "123" });

    expect(res.statusCode).toBe(400);
  });

  // ================= LOGIN =================
  it("login สำเร็จ", async () => {
    const user = createUser();

    await request(app).post("/api/auth/register").send(user);

    const res = await request(app)
      .post("/api/auth/login")
      .send(user);

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("login password ผิด", async () => {
    const user = createUser();

    await request(app).post("/api/auth/register").send(user);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong" });

    expect(res.statusCode).toBe(401);
  });

  it("login user ไม่พบ", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nouser@test.com", password: "Password123" });

    expect(res.statusCode).toBe(401);
  });

  // ================= ME =================
  it("me สำเร็จ", async () => {
    const user = createUser();

    await request(app).post("/api/auth/register").send(user);

    const login = await request(app)
      .post("/api/auth/login")
      .send(user);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(user.email.toLowerCase());
  });

  it("me ไม่มี token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.statusCode).toBe(401);
  });

  // ================= REFRESH =================
  it("refresh สำเร็จ", async () => {
    const user = createUser();

    await request(app).post("/api/auth/register").send(user);

    const login = await request(app)
      .post("/api/auth/login")
      .send(user);

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: login.body.refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("refresh ปลอม", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "fake" });

    expect(res.statusCode).toBe(401);
  });

  // ================= LOGOUT =================
  it("logout สำเร็จ", async () => {
    const user = createUser();

    await request(app).post("/api/auth/register").send(user);

    const login = await request(app)
      .post("/api/auth/login")
      .send(user);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("logout แล้ว token ใช้ไม่ได้", async () => {
    const user = createUser();

    await request(app).post("/api/auth/register").send(user);

    const login = await request(app)
      .post("/api/auth/login")
      .send(user);

    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(res.statusCode).toBe(401);
  });

});