const h = require("./helpers");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

let app, superAdmin, superC, uniAdmin, uniC, student, studentC;
beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000, apiRateLimit: 100000 });
});
beforeEach(async () => {
  superAdmin = await h.createUser({ role: "super_admin" });
  uniAdmin = await h.createUser({ role: "uni_admin" });
  student = await h.createUser();
  [superC, uniC, studentC] = await Promise.all([superAdmin, uniAdmin, student].map((u) => h.loggedInClient(app, u)));
});
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

test("admin endpoints are closed to students", async () => {
  expect((await studentC.get("/api/admin/approvals")).status).toBe(403);
  expect((await studentC.get("/api/admin/users")).status).toBe(403);
  expect((await studentC.patch(`/api/admin/users/${student._id}/role`).send({ role: "super_admin" })).status).toBe(403);
});

test("only super admins grant roles, never to themselves, and it is audited", async () => {
  expect((await uniC.patch(`/api/admin/users/${student._id}/role`).send({ role: "uni_admin" })).status).toBe(403);
  expect((await superC.patch(`/api/admin/users/${superAdmin._id}/role`).send({ role: "student" })).status).toBe(400);

  const res = await superC.patch(`/api/admin/users/${student._id}/role`).send({ role: "uni_admin" });
  expect(res.body.data.role).toBe("uni_admin");
  const log = await AuditLog.findOne({ action: "user.role_change" });
  expect(log.meta).toEqual({ from: "student", to: "uni_admin" });
  expect(String(log.actor)).toBe(String(superAdmin._id));
});

test("role changes take effect on the user's existing session", async () => {
  expect((await studentC.get("/api/admin/approvals")).status).toBe(403);
  await superC.patch(`/api/admin/users/${student._id}/role`).send({ role: "uni_admin" });
  expect((await studentC.get("/api/admin/approvals")).status).toBe(200);
  await superC.patch(`/api/admin/users/${student._id}/role`).send({ role: "student" });
  expect((await studentC.get("/api/admin/approvals")).status).toBe(403);
});

test("suspending a user ends their session; uni admins cannot suspend admins", async () => {
  expect((await uniC.patch(`/api/admin/users/${superAdmin._id}/status`).send({ status: "suspended" })).status).toBe(403);
  expect((await uniC.patch(`/api/admin/users/${student._id}/status`).send({ status: "suspended" })).status).toBe(200);
  expect((await studentC.get("/api/auth/me")).status).toBe(401);
});

test("user search never returns password hashes", async () => {
  const res = await uniC.get(`/api/admin/users?q=${encodeURIComponent(student.email)}`);
  expect(res.body.data).toHaveLength(1);
  expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|scrypt/);
});

test("approval queue lists pending clubs and events", async () => {
  const club = await h.createClub({ status: "pending" });
  const approved = await h.createClub();
  await h.createEvent(approved, { status: "pending_approval" });
  const res = await uniC.get("/api/admin/approvals");
  expect(res.body.data.clubs.map((c) => String(c._id))).toEqual([String(club._id)]);
  expect(res.body.data.events).toHaveLength(1);
});

test("profile updates: own name/profile only; PRN is unique", async () => {
  const res = await studentC.patch("/api/auth/me").send({ name: "New Name", role: "super_admin", profile: { prn: "prn-1", year: 3, department: "IT" } });
  expect(res.body.data).toMatchObject({ name: "New Name", role: "student", profile: { prn: "PRN-1", year: 3 } });
  expect((await User.findById(student._id)).role).toBe("student");

  const other = await h.loggedInClient(app, await h.createUser());
  const dup = await other.patch("/api/auth/me").send({ profile: { prn: "PRN-1" } });
  expect(dup.status).toBe(409);
});
