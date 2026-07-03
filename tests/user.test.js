const request = require("supertest");
const app = require("../src/server");
const prisma = require("../src/config/prisma");

const createUser = () => ({
  name: "User Test",
  email: `user_${Date.now()}@test.com`,
  password: "Password123",
});

let admin = {};
let user = {};

beforeAll(async () => {
  await prisma.blacklistToken.deleteMany();
  await prisma.user.deleteMany();

  // 🔥 create admin
  const adminData = createUser();

  await request(app).post("/api/auth/register").send(adminData);

  const loginAdmin = await request(app)
    .post("/api/auth/login")
    .send(adminData);

  const adminUser = await prisma.user.findUnique({
    where: { email: adminData.email },
  });

  // set role = admin
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { role: "admin" },
  });

  admin = {
    ...loginAdmin.body,
    id: adminUser.id,
  };

  // 🔥 create normal user
  const userData = createUser();

  await request(app).post("/api/auth/register").send(userData);

  const loginUser = await request(app)
    .post("/api/auth/login")
    .send(userData);

  const normalUser = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  user = {
    ...loginUser.body,
    id: normalUser.id,
  };
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("USER & ADMIN API", () => {

  // ================= GET USERS =================
  it("admin ดู users ได้", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.users).toBeDefined();
  });

  it("user ดู users ไม่ได้", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.statusCode).toBe(403);
  });

  // ================= GET USER BY ID =================
  it("admin ดู user by id ได้", async () => {
    const res = await request(app)
      .get(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });

  it("user ดูตัวเองได้", async () => {
    const res = await request(app)
      .get(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("user ดูคนอื่นไม่ได้", async () => {
    const res = await request(app)
      .get(`/api/users/${admin.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.statusCode).toBe(403);
  });

  // ================= UPDATE =================
  it("user update ตัวเองได้", async () => {
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Updated Name" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
  });

  it("user update คนอื่นไม่ได้", async () => {
    const res = await request(app)
      .put(`/api/users/${admin.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Hack" });

    expect(res.statusCode).toBe(403);
  });

  it("admin update user ได้", async () => {
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ name: "Admin Updated" });

    expect(res.statusCode).toBe(200);
  });

  // ================= CREATE USER =================
  it("admin create user", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send(createUser());

    expect(res.statusCode).toBe(201);
    expect(res.body.data.email).toBeDefined();
  });

  it("user create user ไม่ได้", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(createUser());

    expect(res.statusCode).toBe(403);
  });

  // ================= TOGGLE STATUS =================
  it("admin toggle status", async () => {
    const res = await request(app)
      .patch(`/api/users/${user.id}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.is_active).toBeDefined();
  });

  it("user toggle status ไม่ได้", async () => {
    const res = await request(app)
      .patch(`/api/users/${admin.id}/status`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.statusCode).toBe(403);
  });

  // ================= DELETE =================
  it("admin delete user", async () => {
    const newUser = createUser();

    await request(app).post("/api/auth/register").send(newUser);

    const created = await prisma.user.findUnique({
      where: { email: newUser.email },
    });

    const res = await request(app)
      .delete(`/api/users/${created.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("admin ลบตัวเองไม่ได้", async () => {
    const res = await request(app)
      .delete(`/api/users/${admin.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.statusCode).toBe(400);
  });

  it("user delete ไม่ได้", async () => {
    const res = await request(app)
      .delete(`/api/users/${admin.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.statusCode).toBe(403);
  });

});