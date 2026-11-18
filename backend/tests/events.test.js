const h = require("./helpers");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const AuditLog = require("../models/AuditLog");

let app;
let admin, organizer, outsider, volunteer; // users
let adminC, organizerC, outsiderC, volunteerC, anonC; // clients
let club;

beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000, apiRateLimit: 100000 });
});
beforeEach(async () => {
  admin = await h.createUser({ role: "uni_admin" });
  organizer = await h.createUser();
  volunteer = await h.createUser();
  outsider = await h.createUser();
  club = await h.createClub({ owner: organizer, volunteers: [volunteer] });
  [adminC, organizerC, outsiderC, volunteerC] = await Promise.all(
    [admin, organizer, outsider, volunteer].map((u) => h.loggedInClient(app, u))
  );
  anonC = h.client(app);
});
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

describe("creating events", () => {
  test("a club organizer creates a draft; server sets seats, club name and status", async () => {
    const res = await organizerC.post("/api/campus/events").send({
      ...h.eventBody(club, { capacity: 30 }),
      seatsAvailable: 9999,
      status: "published",
      organizerClub: "Fake Club",
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "draft", seatsAvailable: 30, organizerClub: club.name });
    expect(res.body.data._id).toMatch(/^EVT-/);
    expect(await AuditLog.countDocuments({ action: "event.create" })).toBe(1);
  });

  test("students, volunteers and anonymous users cannot create events", async () => {
    expect((await anonC.post("/api/campus/events").send(h.eventBody(club))).status).toBe(401);
    expect((await outsiderC.post("/api/campus/events").send(h.eventBody(club))).status).toBe(403);
    expect((await volunteerC.post("/api/campus/events").send(h.eventBody(club))).status).toBe(403);
  });

  test("organizers cannot create events for another club", async () => {
    const otherClub = await h.createClub({ owner: outsider });
    expect((await organizerC.post("/api/campus/events").send(h.eventBody(otherClub))).status).toBe(403);
  });

  test("clubs that are not approved cannot create events", async () => {
    const pendingClub = await h.createClub({ status: "pending", owner: outsider });
    const res = await outsiderC.post("/api/campus/events").send(h.eventBody(pendingClub));
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/approved/);
  });

  test("invalid schedules and fields are rejected", async () => {
    const endsBeforeStart = h.eventBody(club, { endsAt: h.inHours(47).toISOString() });
    expect((await organizerC.post("/api/campus/events").send(endsBeforeStart)).status).toBe(400);
    const res = await organizerC.post("/api/campus/events").send(h.eventBody(club, { category: "Party", capacity: -1 }));
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toEqual(expect.arrayContaining(["category", "capacity"]));
  });
});

describe("visibility", () => {
  test("drafts are hidden from the public and other users, visible to the club and admins", async () => {
    const draft = await h.createEvent(club, { status: "draft" });
    expect((await anonC.get(`/api/campus/events/${draft._id}`)).status).toBe(404);
    expect((await outsiderC.get(`/api/campus/events/${draft._id}`)).status).toBe(404);
    expect((await organizerC.get(`/api/campus/events/${draft._id}`)).status).toBe(200);
    expect((await adminC.get(`/api/campus/events/${draft._id}`)).status).toBe(200);
  });

  test("the event page tells the viewer what they may do", async () => {
    const ev = await h.createEvent(club);
    const asOrganizer = await organizerC.get(`/api/campus/events/${ev._id}`);
    expect(asOrganizer.body.viewer).toMatchObject({ role: "owner", canManage: true, canReview: false });
    const asAnon = await anonC.get(`/api/campus/events/${ev._id}`);
    expect(asAnon.body.viewer).toMatchObject({ role: null, canManage: false });
  });

  test("manage list shows only the user's own clubs' events", async () => {
    const otherClub = await h.createClub({ owner: outsider });
    await h.createEvent(club, { status: "draft" });
    await h.createEvent(otherClub, { status: "draft" });
    const mine = await organizerC.get("/api/campus/manage/events");
    expect(mine.body.data).toHaveLength(1);
    expect((await adminC.get("/api/campus/manage/events")).body.data).toHaveLength(2);
    const student = await h.loggedInClient(app, await h.createUser());
    expect((await student.get("/api/campus/manage/events")).body.data).toHaveLength(0);
  });
});

describe("lifecycle", () => {
  const act = (c, id, action, body = {}) => c.post(`/api/campus/events/${id}/${action}`).send(body);

  test("draft → pending → approved → published, with the right people at each step", async () => {
    const { _id } = (await organizerC.post("/api/campus/events").send(h.eventBody(club))).body.data;

    expect((await act(organizerC, _id, "submit")).body.data.status).toBe("pending_approval");
    // Organizers cannot approve their own events
    expect((await act(organizerC, _id, "approve")).status).toBe(403);
    expect((await act(adminC, _id, "approve")).body.data.status).toBe("approved");
    // Not public until published
    expect((await anonC.get(`/api/campus/events/${_id}`)).status).toBe(404);
    expect((await act(organizerC, _id, "publish")).body.data.status).toBe("published");
    expect((await anonC.get(`/api/campus/events/${_id}`)).status).toBe(200);

    const actions = (await AuditLog.find({ targetId: _id }).sort({ createdAt: 1 })).map((a) => a.action);
    expect(actions).toEqual(["event.create", "event.submit", "event.approve", "event.publish"]);
  });

  test("rejection needs a reason, and rejected events can be fixed and resubmitted", async () => {
    const ev = await h.createEvent(club, { status: "pending_approval" });
    expect((await act(adminC, ev._id, "reject")).status).toBe(400);
    const rejected = await act(adminC, ev._id, "reject", { reason: "Venue unavailable" });
    expect(rejected.body.data).toMatchObject({ status: "rejected", statusReason: "Venue unavailable" });

    await organizerC.put(`/api/campus/events/${ev._id}`).send({ venue: "Hall B" });
    const resubmitted = await act(organizerC, ev._id, "submit");
    expect(resubmitted.body.data.status).toBe("pending_approval");
    expect(resubmitted.body.data.statusReason).toBeUndefined();
  });

  test("invalid transitions are refused", async () => {
    const draft = await h.createEvent(club, { status: "draft" });
    expect((await act(organizerC, draft._id, "publish")).status).toBe(409);
    expect((await act(adminC, draft._id, "approve")).status).toBe(409);
    expect((await act(organizerC, draft._id, "complete")).status).toBe(409);
  });

  test("events in the past cannot be submitted", async () => {
    const ev = await h.createEvent(club, { status: "draft", startsAt: h.inHours(-5), endsAt: h.inHours(-3) });
    const res = await act(organizerC, ev._id, "submit");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/past/);
  });

  test("events awaiting approval cannot be edited until withdrawn", async () => {
    const ev = await h.createEvent(club, { status: "pending_approval" });
    expect((await organizerC.put(`/api/campus/events/${ev._id}`).send({ venue: "X Hall" })).status).toBe(409);
    expect((await act(organizerC, ev._id, "withdraw")).body.data.status).toBe("draft");
    expect((await organizerC.put(`/api/campus/events/${ev._id}`).send({ venue: "X Hall" })).status).toBe(200);
  });

  test("cancelling an event invalidates all its tickets", async () => {
    const ev = await h.createEvent(club);
    const student = await h.createStudent();
    const sc = await h.loggedInClient(app, student);
    const { ticketId } = (await sc.post(`/api/campus/events/${ev._id}/register`).send({})).body.data;

    expect((await act(organizerC, ev._id, "cancel")).status).toBe(400); // reason required
    const res = await act(organizerC, ev._id, "cancel", { reason: "Speaker unavailable" });
    expect(res.body.data.status).toBe("cancelled");
    expect((await Registration.findOne({ ticketId })).toObject()).toMatchObject({ status: "cancelled", cancelReason: "event_cancelled" });
  });

  test("events can only be completed after they end", async () => {
    const future = await h.createEvent(club);
    expect((await act(organizerC, future._id, "complete")).status).toBe(400);
    const past = await h.createEvent(club, { startsAt: h.inHours(-5), endsAt: h.inHours(-3) });
    expect((await act(organizerC, past._id, "complete")).body.data.status).toBe("completed");
  });
});

describe("editing", () => {
  test("raising capacity adds seats; lowering below bookings is refused", async () => {
    const ev = await h.createEvent(club, { capacity: 10, seatsAvailable: 2 }); // 8 booked
    let res = await organizerC.put(`/api/campus/events/${ev._id}`).send({ capacity: 15 });
    expect(res.body.data).toMatchObject({ capacity: 15, seatsAvailable: 7 });
    res = await organizerC.put(`/api/campus/events/${ev._id}`).send({ capacity: 7 });
    expect(res.status).toBe(409);
  });

  test("status and seats cannot be changed through edits; dates can be cleared", async () => {
    const ev = await h.createEvent(club, { status: "draft", registrationClosesAt: h.inHours(20) });
    await organizerC
      .put(`/api/campus/events/${ev._id}`)
      .send({ venue: "Hall B", seatsAvailable: 1000, status: "published", registrationClosesAt: null });
    const after = (await Event.findById(ev._id)).toObject();
    expect(after).toMatchObject({ venue: "Hall B", seatsAvailable: 50, status: "draft" });
    expect(after.registrationClosesAt).toBeUndefined();
  });

  test("other clubs' organizers cannot edit, delete or transition", async () => {
    const ev = await h.createEvent(club);
    const otherOrganizer = await h.createUser();
    await h.createClub({ owner: otherOrganizer });
    const c = await h.loggedInClient(app, otherOrganizer);
    expect((await c.put(`/api/campus/events/${ev._id}`).send({ venue: "Hacked" })).status).toBe(403);
    expect((await c.post(`/api/campus/events/${ev._id}/cancel`).send({ reason: "x" })).status).toBe(403);
    expect((await c.delete(`/api/campus/events/${ev._id}`)).status).toBe(403);
  });

  test("only drafts without registrations can be deleted", async () => {
    const published = await h.createEvent(club);
    expect((await organizerC.delete(`/api/campus/events/${published._id}`)).status).toBe(409);
    const draft = await h.createEvent(club, { status: "draft" });
    expect((await organizerC.delete(`/api/campus/events/${draft._id}`)).status).toBe(200);
  });
});

describe("public discovery", () => {
  beforeEach(async () => {
    const other = await h.createClub({ name: "Music Society" });
    await h.createEvent(club, { title: "React Workshop", category: "Workshop", startsAt: h.inHours(10), endsAt: h.inHours(12) });
    await h.createEvent(club, { title: "Hackathon", tags: ["coding"], entryFee: 100, startsAt: h.inHours(30), endsAt: h.inHours(40) });
    await h.createEvent(other, { title: "Music Night", category: "Cultural", startsAt: h.inHours(20), endsAt: h.inHours(22) });
    await h.createEvent(club, { title: "Old Talk", status: "completed", startsAt: h.inHours(-50), endsAt: h.inHours(-48) });
    await h.createEvent(club, { title: "Secret Draft", status: "draft" });
    await h.createEvent(club, { title: "Pending One", status: "pending_approval" });
  });
  const list = (qs = "") => anonC.get(`/api/campus/events${qs}`);
  const titles = (res) => res.body.data.map((e) => e.title);

  test("upcoming (default) lists published future events, soonest first, never drafts", async () => {
    expect(titles(await list())).toEqual(["React Workshop", "Music Night", "Hackathon"]);
  });
  test("past events", async () => {
    expect(titles(await list("?when=past"))).toEqual(["Old Talk"]);
  });
  test("search matches title, club and tags; regex characters are treated literally", async () => {
    expect(titles(await list("?q=react"))).toEqual(["React Workshop"]);
    expect(titles(await list("?q=coding"))).toEqual(["Hackathon"]);
    expect(titles(await list("?q=music"))).toEqual(["Music Night"]);
    expect((await list("?q=.*")).body.data).toHaveLength(0);
  });
  test("filters: category, price, club", async () => {
    expect(titles(await list("?category=Cultural"))).toEqual(["Music Night"]);
    expect(titles(await list("?price=paid"))).toEqual(["Hackathon"]);
    expect(titles(await list(`?club=${club.slug}`))).toEqual(["React Workshop", "Hackathon"]);
    expect((await list("?club=does-not-exist")).body.data).toHaveLength(0);
  });
  test("pagination", async () => {
    const res = await list("?limit=2&page=2");
    expect(titles(res)).toEqual(["Hackathon"]);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
  });
  test("bad query values are rejected", async () => {
    expect((await list("?limit=500")).status).toBe(400);
    expect((await list("?when=sometime")).status).toBe(400);
  });
});
