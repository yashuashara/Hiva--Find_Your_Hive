const os = require("os");
const path = require("path");
const fs = require("fs");

// Uploads go to a throwaway folder for this test file.
const UPLOAD_DIR = path.join(os.tmpdir(), `ee-test-uploads-${Date.now()}`);
process.env.UPLOAD_DIR = UPLOAD_DIR;

const h = require("./helpers");
const Registration = require("../models/Registration");
const Event = require("../models/Event");

let app;
beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000, apiRateLimit: 100000 });
});
afterEach(() => h.clearDb());
afterAll(async () => {
  await h.stopDb();
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
});

async function registerMany(event, n) {
  const tickets = [];
  for (let i = 0; i < n; i++) {
    const sc = await h.loggedInClient(app, await h.createStudent());
    tickets.push((await sc.post(`/api/campus/events/${event._id}/register`).send({})).body.data.ticketId);
  }
  return tickets;
}

describe("club dashboard", () => {
  test("numbers come from real data, attendance only counts ended events", async () => {
    const owner = await h.createUser();
    const club = await h.createClub({ owner });
    const ownerC = await h.loggedInClient(app, owner);

    const upcoming = await h.createEvent(club, { capacity: 10 });
    await registerMany(upcoming, 4);

    const past = await h.createEvent(club, { capacity: 10 });
    const pastTickets = await registerMany(past, 4);
    for (const t of pastTickets.slice(0, 3)) await ownerC.put(`/api/campus/registrations/${t}`).send({ checkInStatus: true });
    await Event.updateOne({ _id: past._id }, { startsAt: h.inHours(-5), endsAt: h.inHours(-3) });
    await h.createEvent(club, { status: "draft" });

    const res = await ownerC.get(`/api/analytics/clubs/${club._id}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totals).toMatchObject({
      events: 3,
      upcoming: 1,
      registrations: 8,
      checkedIn: 3,
      attendanceRate: 75, // 3 of 4 at the past event; upcoming event not counted
      capacityUtilization: 40, // 8 of 20 seats
    });
    expect(d.statusCounts).toMatchObject({ published: 2, draft: 1 });
    expect(d.trend).toHaveLength(30);
    expect(d.trend.at(-1).count).toBe(8);
    expect(d.recentRegistrations).toHaveLength(8);
    expect(d.events.find((e) => e.id === past._id)).toMatchObject({ registered: 4, checkedIn: 3, attendanceRate: 75 });
  });

  test("only the club's owners/organizers and admins can see it", async () => {
    const owner = await h.createUser();
    const volunteer = await h.createUser();
    const club = await h.createClub({ owner, volunteers: [volunteer] });
    const url = `/api/analytics/clubs/${club._id}`;
    expect((await (await h.loggedInClient(app, volunteer)).get(url)).status).toBe(403);
    expect((await (await h.loggedInClient(app, await h.createUser())).get(url)).status).toBe(403);
    expect((await (await h.loggedInClient(app, await h.createUser({ role: "uni_admin" }))).get(url)).status).toBe(200);
  });
});

describe("admin dashboard", () => {
  test("aggregates across clubs and reports pending work", async () => {
    const clubA = await h.createClub();
    const clubB = await h.createClub();
    await h.createClub({ status: "pending" });
    const e1 = await h.createEvent(clubA, { category: "Technical" });
    await h.createEvent(clubB, { category: "Cultural" });
    await h.createEvent(clubB, { status: "pending_approval" });
    await registerMany(e1, 3);

    const admin = await h.loggedInClient(app, await h.createUser({ role: "uni_admin" }));
    const res = await admin.get("/api/analytics/admin");
    expect(res.status).toBe(200);
    expect(res.body.data.totals).toMatchObject({ events: 3, registrations: 3 });
    expect(res.body.data.pending).toMatchObject({ clubs: 1, events: 1 });
    expect(res.body.data.byCategory).toEqual({ Technical: 1, Cultural: 1 });
    expect(res.body.data.topEvents[0]).toMatchObject({ id: e1._id, registered: 3 });

    const student = await h.loggedInClient(app, await h.createUser());
    expect((await student.get("/api/analytics/admin")).status).toBe(403);
  });
});

describe("follows and recommendations", () => {
  test("follow/unfollow is idempotent and shows on the club page", async () => {
    const club = await h.createClub();
    const sc = await h.loggedInClient(app, await h.createUser());
    await sc.post(`/api/clubs/${club._id}/follow`).send({});
    const again = await sc.post(`/api/clubs/${club._id}/follow`).send({});
    expect(again.body.data).toEqual({ following: true, followers: 1 });
    const page = await sc.get(`/api/clubs/${club.slug}`);
    expect(page.body.viewer.following).toBe(true);
    expect(page.body.data.followers).toBe(1);
    expect((await sc.delete(`/api/clubs/${club._id}/follow`)).body.data).toEqual({ following: false, followers: 0 });
  });

  test("cannot follow pending clubs; anonymous users cannot follow", async () => {
    const pending = await h.createClub({ status: "pending" });
    const sc = await h.loggedInClient(app, await h.createUser());
    expect((await sc.post(`/api/clubs/${pending._id}/follow`).send({})).status).toBe(404);
    const club = await h.createClub();
    expect((await h.client(app).post(`/api/clubs/${club._id}/follow`).send({})).status).toBe(401);
  });

  test("recommendations favour followed clubs and past categories, exclude registered/full/closed", async () => {
    const followedClub = await h.createClub();
    const other = await h.createClub();
    const fromFollowed = await h.createEvent(followedClub, { title: "Followed", category: "Sports" });
    const sameCategory = await h.createEvent(other, { title: "Same category", category: "Cultural" });
    const plain = await h.createEvent(other, { title: "Plain", category: "Seminar" });
    await h.createEvent(other, { title: "Full", capacity: 1, seatsAvailable: 0 });
    await h.createEvent(other, { title: "Closed", registrationClosesAt: h.inHours(-1) });
    const attendedBefore = await h.createEvent(other, { title: "Already registered", category: "Cultural" });

    const student = await h.createStudent();
    const sc = await h.loggedInClient(app, student);
    await sc.post(`/api/clubs/${followedClub._id}/follow`).send({});
    await sc.post(`/api/campus/events/${attendedBefore._id}/register`).send({});

    const res = await sc.get("/api/me/recommendations");
    const titles = res.body.data.map((e) => e.title);
    expect(titles.slice(0, 2)).toEqual(["Followed", "Same category"]);
    expect(titles).toContain("Plain");
    expect(titles).not.toEqual(expect.arrayContaining(["Full"]));
    expect(titles).not.toContain("Closed");
    expect(titles).not.toContain("Already registered");
    expect(res.body.data[0].recommendation.reasons).toEqual(["followed_club"]);
    expect([fromFollowed, sameCategory, plain].length).toBe(3);
  });

  test("student dashboard counts come from the student's own registrations", async () => {
    const club = await h.createClub();
    const upcoming = await h.createEvent(club);
    const past = await h.createEvent(club);
    const student = await h.createStudent();
    const sc = await h.loggedInClient(app, student);
    await sc.post(`/api/campus/events/${upcoming._id}/register`).send({});
    const { ticketId } = (await sc.post(`/api/campus/events/${past._id}/register`).send({})).body.data;
    await Registration.updateOne({ ticketId }, { checkInStatus: true });
    await Event.updateOne({ _id: past._id }, { startsAt: h.inHours(-5), endsAt: h.inHours(-3) });

    const res = await sc.get("/api/me/dashboard");
    expect(res.body.data.counts).toMatchObject({ upcoming: 1, attended: 1, missed: 0, cancelled: 0, total: 2 });
  });
});

describe("image uploads", () => {
  // Smallest valid PNG (1x1) and a fake "image" that is really HTML.
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const upload = (c, buf, filename, contentType) =>
    c.raw.post("/api/uploads/images").set("X-Requested-With", "XMLHttpRequest").attach("image", buf, { filename, contentType });

  test("valid images are stored under a random name and served safely", async () => {
    const sc = await h.loggedInClient(app, await h.createUser());
    const res = await upload(sc, PNG, "../../evil name.png", "image/png");
    expect(res.status).toBe(201);
    const url = new URL(res.body.data.url);
    expect(url.pathname).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/);

    const file = await h.client(app).get(url.pathname);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/png");
    expect(file.headers["x-content-type-options"]).toBe("nosniff");
    expect(file.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  test("files that are not really images are refused, whatever they claim to be", async () => {
    const sc = await h.loggedInClient(app, await h.createUser());
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    expect((await upload(sc, html, "photo.png", "image/png")).status).toBe(415);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await upload(sc, svg, "logo.svg", "image/svg+xml")).status).toBe(415);
  });

  test("size limit, sign-in and missing files", async () => {
    const sc = await h.loggedInClient(app, await h.createUser());
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    expect((await upload(sc, big, "big.png", "image/png")).status).toBe(413);
    expect((await upload(h.client(app), PNG, "a.png", "image/png")).status).toBe(401);
    expect((await h.client(app).get("/uploads/nope.png")).status).toBe(404);
    // Path traversal is refused (403) and the source file is never served.
    const traversal = await h.client(app).get("/uploads/../app.js");
    expect([403, 404]).toContain(traversal.status);
    expect(traversal.text).not.toContain("createApp");
  });
});
