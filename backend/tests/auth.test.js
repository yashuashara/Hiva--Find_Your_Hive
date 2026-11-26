const h = require("./helpers");
const User = require("../models/User");

let app;
beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000 });
});
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

describe("sign-up", () => {
  test("creates a student account, starts a session and never returns the hash", async () => {
    const c = h.client(app);
    const res = await c
      .post("/api/auth/signup")
      .send({ name: "Asha", email: " Asha@Example.com ", password: "long-enough-pass" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: "asha@example.com", role: "student" });
    expect(res.body.data.passwordHash).toBeUndefined();

    const stored = await User.findOne({ email: "asha@example.com" }).select("+passwordHash");
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain("long-enough-pass");

    const me = await c.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe("asha@example.com");
  });

  test("cannot sign up as an admin by sending a role", async () => {
    const res = await h
      .client(app)
      .post("/api/auth/signup")
      .send({ name: "Mallory", email: "m@example.com", password: "long-enough-pass", role: "super_admin" });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("student");
  });

  test("any email domain is allowed (no university-domain restriction)", async () => {
    const res = await h
      .client(app)
      .post("/api/auth/signup")
      .send({ name: "Gmail User", email: "someone@gmail.com", password: "long-enough-pass" });
    expect(res.status).toBe(201);
  });

  test("rejects duplicate emails, short passwords and bad emails", async () => {
    const c = h.client(app);
    const body = { name: "Asha", email: "dup@example.com", password: "long-enough-pass" };
    expect((await c.post("/api/auth/signup").send(body)).status).toBe(201);
    expect((await h.client(app).post("/api/auth/signup").send(body)).status).toBe(409);
    expect((await h.client(app).post("/api/auth/signup").send({ ...body, email: "s@example.com", password: "short" })).status).toBe(400);
    expect((await h.client(app).post("/api/auth/signup").send({ ...body, email: "not-an-email" })).status).toBe(400);
  });
});

describe("login / logout", () => {
  test("logs in with correct credentials and out again", async () => {
    const user = await h.createUser({ email: "s@example.com" });
    const c = await h.loggedInClient(app, user);
    expect((await c.get("/api/auth/me")).status).toBe(200);

    expect((await c.post("/api/auth/logout")).status).toBe(200);
    expect((await c.get("/api/auth/me")).status).toBe(401);
  });

  test("same generic error for wrong password and unknown email", async () => {
    await h.createUser({ email: "s@example.com" });
    const wrongPw = await h.client(app).post("/api/auth/login").send({ email: "s@example.com", password: "nope-nope-nope" });
    const noUser = await h.client(app).post("/api/auth/login").send({ email: "ghost@example.com", password: "nope-nope-nope" });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPw.body.message).toBe(noUser.body.message);
  });

  test("suspended users cannot log in, and existing sessions stop working", async () => {
    const user = await h.createUser({ email: "s@example.com" });
    const c = await h.loggedInClient(app, user);
    await User.updateOne({ _id: user._id }, { status: "suspended" });
    expect((await c.get("/api/auth/me")).status).toBe(401);

    const res = await h.client(app).post("/api/auth/login").send({ email: "s@example.com", password: h.PASSWORD });
    expect(res.status).toBe(403);
  });

  test("session cookie is httpOnly", async () => {
    const user = await h.createUser({ email: "s@example.com" });
    const res = await h.client(app).post("/api/auth/login").send({ email: user.email, password: h.PASSWORD });
    const cookie = res.headers["set-cookie"].join(";");
    expect(cookie).toMatch(/hiva\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});

describe("security middleware", () => {
  test("state-changing requests without the CSRF header are rejected", async () => {
    const request = require("supertest");
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "x" });
    expect(res.status).toBe(403);
  });

  test("login is rate limited", async () => {
    const strictApp = h.createApp({ authRateLimit: 3 });
    const c = h.client(strictApp);
    const attempt = () => c.post("/api/auth/login").send({ email: "a@example.com", password: "wrong-password" });
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
  });

  test("errors do not leak internals and unknown routes 404", async () => {
    const c = h.client(app);
    const res = await c.post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Malformed JSON body" });
    expect((await c.get("/api/nope")).status).toBe(404);
  });

  test("health check reports database status", async () => {
    const res = await h.client(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "up" });
  });
});
