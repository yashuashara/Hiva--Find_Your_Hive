const h = require("./helpers");
const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const AuditLog = require("../models/AuditLog");

let app;
beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000, apiRateLimit: 100000 });
});
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

const clubBody = (overrides = {}) => ({
  name: "Photography Club",
  description: "We take photos",
  category: "Arts",
  socials: { instagram: "https://instagram.com/photoclub" },
  ...overrides,
});

describe("club requests and approval", () => {
  test("a student's club request is pending and grants no powers until approved", async () => {
    const student = await h.createUser();
    const sc = await h.loggedInClient(app, student);
    const res = await sc.post("/api/clubs").send({ ...clubBody(), status: "approved" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "pending", slug: "photography-club" });
    const clubId = res.body.data._id;

    // Not public yet, but visible to the requester
    expect((await h.client(app).get("/api/clubs/photography-club")).status).toBe(404);
    expect((await sc.get("/api/clubs/photography-club")).status).toBe(200);
    // Cannot create events yet
    expect((await sc.post("/api/campus/events").send(h.eventBody({ _id: clubId }))).status).toBe(403);

    const admin = await h.loggedInClient(app, await h.createUser({ role: "uni_admin" }));
    const approved = await admin.post(`/api/clubs/${clubId}/approve`).send({});
    expect(approved.body.data.status).toBe("approved");

    // Requester is now the active owner and can create events
    const membership = await ClubMembership.findOne({ club: clubId, user: student._id });
    expect(membership.toObject()).toMatchObject({ role: "owner", status: "active" });
    expect((await sc.post("/api/campus/events").send(h.eventBody({ _id: clubId }))).status).toBe(201);
    expect((await h.client(app).get("/api/clubs/photography-club")).body.data.team).toEqual([
      { name: "Test User", role: "owner" },
    ]);
  });

  test("students cannot approve clubs; rejection and suspension need reasons", async () => {
    const owner = await h.createUser();
    const club = await h.createClub({ status: "pending", owner });
    const ownerC = await h.loggedInClient(app, owner);
    expect((await ownerC.post(`/api/clubs/${club._id}/approve`).send({})).status).toBe(403);

    const admin = await h.loggedInClient(app, await h.createUser({ role: "uni_admin" }));
    expect((await admin.post(`/api/clubs/${club._id}/reject`).send({})).status).toBe(400);
    expect((await admin.post(`/api/clubs/${club._id}/reject`).send({ reason: "Duplicate" })).body.data.status).toBe("rejected");

    const active = await h.createClub();
    expect((await admin.post(`/api/clubs/${active._id}/suspend`).send({ reason: "Misconduct" })).body.data.status).toBe("suspended");
    expect((await h.client(app).get(`/api/clubs/${active.slug}`)).status).toBe(404);
    expect(await AuditLog.countDocuments({ action: { $in: ["club.reject", "club.suspend"] } })).toBe(2);
  });

  test("suspending a club removes its organizers' powers", async () => {
    const owner = await h.createUser();
    const club = await h.createClub({ owner });
    const event = await h.createEvent(club, { status: "draft" });
    const ownerC = await h.loggedInClient(app, owner);
    await Club.updateOne({ _id: club._id }, { status: "suspended" });
    expect((await ownerC.put(`/api/campus/events/${event._id}`).send({ venue: "X Hall" })).status).toBe(404);
  });

  test("a user can have at most 3 pending requests; duplicate names are refused", async () => {
    const sc = await h.loggedInClient(app, await h.createUser());
    for (const n of ["A Club", "B Club", "C Club"]) expect((await sc.post("/api/clubs").send(clubBody({ name: n }))).status).toBe(201);
    expect((await sc.post("/api/clubs").send(clubBody({ name: "D Club" }))).status).toBe(429);
    const other = await h.loggedInClient(app, await h.createUser());
    expect((await other.post("/api/clubs").send(clubBody({ name: "a club" }))).status).toBe(409);
  });

  test('"Other" category requires a custom label, which real categories drop', async () => {
    const sc = await h.loggedInClient(app, await h.createUser());
    const missing = await sc.post("/api/clubs").send(clubBody({ name: "CDC", category: "Other" }));
    expect(missing.status).toBe(400);
    expect(missing.body.details[0]).toMatchObject({ field: "customCategory" });

    const ok = await sc.post("/api/clubs").send(clubBody({ name: "CDC", category: "Other", customCategory: " Placement & Careers " }));
    expect(ok.body.data).toMatchObject({ category: "Other", customCategory: "Placement & Careers" });

    const real = await sc.post("/api/clubs").send(clubBody({ name: "Chess Club", category: "Sports", customCategory: "ignored" }));
    expect(real.body.data.customCategory).toBeUndefined();
  });

  test("switching away from Other clears the custom label; switching to Other needs one", async () => {
    const owner = await h.createUser();
    const club = await h.createClub({ owner });
    const ownerC = await h.loggedInClient(app, owner);
    expect((await ownerC.patch(`/api/clubs/${club._id}`).send({ category: "Other" })).status).toBe(400);
    const toOther = await ownerC.patch(`/api/clubs/${club._id}`).send({ category: "Other", customCategory: "Debate" });
    expect(toOther.body.data.customCategory).toBe("Debate");
    const back = await ownerC.patch(`/api/clubs/${club._id}`).send({ category: "Arts" });
    expect(back.body.data.customCategory).toBeUndefined();
  });

  test("only http(s) links are accepted", async () => {
    const sc = await h.loggedInClient(app, await h.createUser());
    const res = await sc.post("/api/clubs").send(clubBody({ logoUrl: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
  });

  test("the public directory lists approved clubs only", async () => {
    await h.createClub({ name: "Approved One" });
    await h.createClub({ name: "Pending One", status: "pending" });
    const res = await h.client(app).get("/api/clubs");
    expect(res.body.data.map((c) => c.name)).toEqual(["Approved One"]);
    // Admins can see the pending queue
    const admin = await h.loggedInClient(app, await h.createUser({ role: "uni_admin" }));
    expect((await admin.get("/api/clubs?status=pending")).body.data.map((c) => c.name)).toEqual(["Pending One"]);
    // Students asking for pending get the public list
    const student = await h.loggedInClient(app, await h.createUser());
    expect((await student.get("/api/clubs?status=pending")).body.data.map((c) => c.name)).toEqual(["Approved One"]);
  });
});

describe("club profile and team", () => {
  let owner, ownerC, club;
  beforeEach(async () => {
    owner = await h.createUser();
    club = await h.createClub({ owner });
    ownerC = await h.loggedInClient(app, owner);
  });

  test("owners edit the profile but cannot rename; others cannot edit", async () => {
    const res = await ownerC.patch(`/api/clubs/${club._id}`).send({ description: "New", socials: { website: "https://club.example" } });
    expect(res.body.data).toMatchObject({ description: "New", socials: { website: "https://club.example" } });
    expect((await ownerC.patch(`/api/clubs/${club._id}`).send({ name: "Renamed" })).status).toBe(403);
    const stranger = await h.loggedInClient(app, await h.createUser());
    expect((await stranger.patch(`/api/clubs/${club._id}`).send({ description: "Hacked" })).status).toBe(403);
  });

  test("owner-added organizers need admin approval before they get powers", async () => {
    const newbie = await h.createUser({ email: "newbie@example.com" });
    const newbieC = await h.loggedInClient(app, newbie);
    const add = await ownerC.post(`/api/clubs/${club._id}/members`).send({ email: "newbie@example.com", role: "organizer" });
    expect(add.status).toBe(201);
    expect(add.body.data.status).toBe("pending");
    expect((await newbieC.post("/api/campus/events").send(h.eventBody(club))).status).toBe(403);

    const admin = await h.loggedInClient(app, await h.createUser({ role: "uni_admin" }));
    const queue = await admin.get("/api/admin/approvals");
    expect(queue.body.data.memberships).toHaveLength(1);
    await admin.post(`/api/clubs/${club._id}/members/${add.body.data._id}/approve`).send({});
    expect((await newbieC.post("/api/campus/events").send(h.eventBody(club))).status).toBe(201);
  });

  test("owners cannot appoint other owners or approve members themselves", async () => {
    await h.createUser({ email: "x@example.com" });
    expect((await ownerC.post(`/api/clubs/${club._id}/members`).send({ email: "x@example.com", role: "owner" })).status).toBe(403);
    const add = await ownerC.post(`/api/clubs/${club._id}/members`).send({ email: "x@example.com", role: "volunteer" });
    expect((await ownerC.post(`/api/clubs/${club._id}/members/${add.body.data._id}/approve`).send({})).status).toBe(403);
  });

  test("unknown emails and duplicates are refused", async () => {
    expect((await ownerC.post(`/api/clubs/${club._id}/members`).send({ email: "ghost@example.com", role: "organizer" })).status).toBe(404);
    expect((await ownerC.post(`/api/clubs/${club._id}/members`).send({ email: owner.email, role: "organizer" })).status).toBe(409);
  });

  test("the last owner cannot leave; members can leave", async () => {
    const owners = await ClubMembership.find({ club: club._id });
    expect((await ownerC.delete(`/api/clubs/${club._id}/members/${owners[0]._id}`)).status).toBe(409);

    const vol = await h.createUser();
    const m = await ClubMembership.create({ club: club._id, user: vol._id, role: "volunteer", status: "active" });
    const volC = await h.loggedInClient(app, vol);
    expect((await volC.delete(`/api/clubs/${club._id}/members/${m._id}`)).status).toBe(200);
  });

  test("team list (with emails) is private to the club", async () => {
    expect((await ownerC.get(`/api/clubs/${club._id}/members`)).body.data[0].user.email).toBe(owner.email);
    const stranger = await h.loggedInClient(app, await h.createUser());
    expect((await stranger.get(`/api/clubs/${club._id}/members`)).status).toBe(403);
    expect(JSON.stringify((await h.client(app).get(`/api/clubs/${club.slug}`)).body)).not.toContain(owner.email);
  });

  test("my clubs", async () => {
    const res = await ownerC.get("/api/clubs/mine");
    expect(res.body.data).toEqual([expect.objectContaining({ role: "owner", status: "active" })]);
  });
});
