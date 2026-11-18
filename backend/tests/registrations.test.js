const h = require("./helpers");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

let app, club, owner, volunteer, ownerC, volunteerC;
beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000, apiRateLimit: 100000 });
});
beforeEach(async () => {
  owner = await h.createUser();
  volunteer = await h.createUser();
  club = await h.createClub({ owner, volunteers: [volunteer] });
  ownerC = await h.loggedInClient(app, owner);
  volunteerC = await h.loggedInClient(app, volunteer);
});
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

const seats = async (id) => (await Event.findById(id)).seatsAvailable;
const walkIn = (c, eventId, i, extra = {}) => c.post("/api/campus/registrations").send({ eventId, ...h.sampleStudent(i), ...extra });

describe("student self-registration", () => {
  let student, sc, event;
  beforeEach(async () => {
    student = await h.createStudent({ name: "Asha Patil" });
    sc = await h.loggedInClient(app, student);
    event = await h.createEvent(club, { capacity: 10 });
  });
  const register = (c = sc, id = event._id) => c.post(`/api/campus/events/${id}/register`).send({});

  test("registers with details from the student's own profile and an unguessable ticket", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      studentName: "Asha Patil",
      studentId: student.profile.prn,
      status: "confirmed",
      paymentDetails: { method: "Free", status: "Completed" },
    });
    expect(res.body.data.ticketId).toMatch(/^TKT-[A-Za-z0-9_-]{22}$/);
    expect(await seats(event._id)).toBe(9);

    const page = await sc.get(`/api/campus/events/${event._id}`);
    expect(page.body.viewer.registration.ticketId).toBe(res.body.data.ticketId);
  });

  test("requires sign-in and a complete profile", async () => {
    expect((await register(h.client(app))).status).toBe(401);
    const noProfile = await h.loggedInClient(app, await h.createUser());
    const res = await register(noProfile);
    expect(res.status).toBe(400);
    expect(res.body.details.code).toBe("PROFILE_INCOMPLETE");
  });

  test("cannot register twice", async () => {
    expect((await register()).status).toBe(201);
    expect((await register()).status).toBe(409);
    expect(await seats(event._id)).toBe(9);
  });

  test("only for published events inside the registration window", async () => {
    const draft = await h.createEvent(club, { status: "draft" });
    expect((await register(sc, draft._id)).status).toBe(404);
    const notOpen = await h.createEvent(club, { registrationOpensAt: h.inHours(5) });
    expect((await register(sc, notOpen._id)).body.message).toMatch(/not opened/);
    const closed = await h.createEvent(club, { registrationClosesAt: h.inHours(-1) });
    expect((await register(sc, closed._id)).body.message).toMatch(/closed/);
    const started = await h.createEvent(club, { startsAt: h.inHours(-1), endsAt: h.inHours(2) });
    expect((await register(sc, started._id)).status).toBe(409);
  });

  test("paid events cannot be booked online until a payment gateway exists", async () => {
    const paid = await h.createEvent(club, { entryFee: 200 });
    const res = await register(sc, paid._id);
    expect(res.status).toBe(409);
    expect(await Registration.countDocuments()).toBe(0);
  });

  test("my tickets lists only my own registrations", async () => {
    await register();
    const other = await h.loggedInClient(app, await h.createStudent());
    await register(other);
    const res = await sc.get("/api/me/registrations?when=upcoming");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].event.title).toBe("HackCampus");
  });

  test("cancelling frees the seat and allows registering again", async () => {
    const { ticketId } = (await register()).body.data;
    const cancel = await sc.post(`/api/me/registrations/${ticketId}/cancel`).send({});
    expect(cancel.body.data.status).toBe("cancelled");
    expect(await seats(event._id)).toBe(10);
    expect((await sc.post(`/api/me/registrations/${ticketId}/cancel`).send({})).status).toBe(409);
    expect((await register()).status).toBe(201);
  });

  test("students cannot cancel other people's tickets", async () => {
    const { ticketId } = (await register()).body.data;
    const other = await h.loggedInClient(app, await h.createStudent());
    expect((await other.post(`/api/me/registrations/${ticketId}/cancel`).send({})).status).toBe(404);
  });

  test("cannot cancel after checking in", async () => {
    const { ticketId } = (await register()).body.data;
    await volunteerC.put(`/api/campus/registrations/${ticketId}`).send({ checkInStatus: true });
    expect((await sc.post(`/api/me/registrations/${ticketId}/cancel`).send({})).status).toBe(409);
  });
});

describe("concurrency", () => {
  test("40 students registering for 5 seats at once: exactly 5 tickets, never oversold", async () => {
    const event = await h.createEvent(club, { capacity: 5 });
    const clients = await Promise.all(
      Array.from({ length: 40 }, async () => h.loggedInClient(app, await h.createStudent()))
    );
    const results = await Promise.all(clients.map((c) => c.post(`/api/campus/events/${event._id}/register`).send({})));

    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(35);
    expect(await Registration.countDocuments({ eventId: event._id, status: "confirmed" })).toBe(5);
    expect(await seats(event._id)).toBe(0);
  });

  test("one student double-clicking 10 times gets exactly one ticket", async () => {
    const event = await h.createEvent(club, { capacity: 50 });
    const sc = await h.loggedInClient(app, await h.createStudent());
    const results = await Promise.all(
      Array.from({ length: 10 }, () => sc.post(`/api/campus/events/${event._id}/register`).send({}))
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await seats(event._id)).toBe(49);
  });

  test("simultaneous scans of one ticket: exactly one check-in succeeds", async () => {
    const event = await h.createEvent(club);
    const { ticketId } = (await walkIn(ownerC, event._id, 1)).body.data;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => volunteerC.put(`/api/campus/registrations/${ticketId}`).send({ checkInStatus: true }))
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
  });
});

describe("walk-in registrations (organizers)", () => {
  test("organizers add walk-ins; payment is never marked paid from client input", async () => {
    const paid = await h.createEvent(club, { entryFee: 200 });
    const res = await walkIn(ownerC, paid._id, 1, {
      paymentMethod: "UPI",
      paymentDetails: { status: "Completed", amountPaid: 200 },
      ticketId: "TICK-1",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.paymentDetails).toMatchObject({ method: "UPI", status: "Pending", amountPaid: 0 });
    expect(res.body.data.ticketId).not.toBe("TICK-1");
  });

  test("volunteers, students and other clubs cannot add walk-ins", async () => {
    const event = await h.createEvent(club);
    expect((await walkIn(volunteerC, event._id, 1)).status).toBe(403);
    const student = await h.loggedInClient(app, await h.createUser());
    expect((await walkIn(student, event._id, 1)).status).toBe(403);
  });

  test("only for published events", async () => {
    const draft = await h.createEvent(club, { status: "draft" });
    expect((await walkIn(ownerC, draft._id, 1)).status).toBe(409);
  });
});

describe("attendee data access", () => {
  test("attendee lists: club organizers and admins only", async () => {
    const event = await h.createEvent(club);
    await walkIn(ownerC, event._id, 1);
    const url = `/api/campus/events/${event._id}/registrations`;
    expect((await ownerC.get(url)).body.count).toBe(1);
    expect((await volunteerC.get(url)).status).toBe(403);
    expect((await h.client(app).get(url)).status).toBe(401);
    const otherOrganizer = await h.createUser();
    await h.createClub({ owner: otherOrganizer });
    expect((await (await h.loggedInClient(app, otherOrganizer)).get(url)).status).toBe(403);
    const admin = await h.loggedInClient(app, await h.createUser({ role: "uni_admin" }));
    expect((await admin.get(url)).body.count).toBe(1);
  });

  test("the all-registrations list is admin-only", async () => {
    expect((await ownerC.get("/api/campus/registrations")).status).toBe(403);
  });

  test("CSV export escapes formulas and is restricted", async () => {
    const event = await h.createEvent(club);
    await walkIn(ownerC, event._id, 1, { studentName: "=HYPERLINK(\"http://evil\")" });
    const res = await ownerC.get(`/api/campus/events/${event._id}/registrations/export`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect((await volunteerC.get(`/api/campus/events/${event._id}/registrations/export`)).status).toBe(403);
  });
});

describe("check-in", () => {
  let event, ticketId;
  beforeEach(async () => {
    event = await h.createEvent(club);
    ticketId = (await walkIn(ownerC, event._id, 1)).body.data.ticketId;
  });
  const checkIn = (c, body = { checkInStatus: true }) => c.put(`/api/campus/registrations/${ticketId}`).send(body);

  test("volunteers check in once; who and when are recorded", async () => {
    const first = await checkIn(volunteerC);
    expect(first.status).toBe(200);
    expect(first.body.data.checkedInBy).toBe(String(volunteer._id));
    const second = await checkIn(volunteerC);
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already/);
    expect(second.body.details.checkedInAt).toBeTruthy();
  });

  test("people outside the club cannot check in or even look up tickets", async () => {
    const other = await h.loggedInClient(app, await h.createUser());
    expect((await checkIn(other)).status).toBe(404);
    expect((await other.get(`/api/campus/registrations/${ticketId}`)).status).toBe(404);
  });

  test("tickets for a different event are rejected at the door", async () => {
    const otherEvent = await h.createEvent(club);
    const res = await checkIn(volunteerC, { checkInStatus: true, eventId: otherEvent._id });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/different event/);
  });

  test("cancelled tickets and cancelled events cannot be checked in", async () => {
    await ownerC.delete(`/api/campus/registrations/${ticketId}`);
    expect((await checkIn(volunteerC)).body.message).toMatch(/cancelled/);

    const ev2 = await h.createEvent(club);
    const t2 = (await walkIn(ownerC, ev2._id, 2)).body.data.ticketId;
    await ownerC.post(`/api/campus/events/${ev2._id}/cancel`).send({ reason: "Rain" });
    expect((await volunteerC.put(`/api/campus/registrations/${t2}`).send({ checkInStatus: true })).status).toBe(409);
  });

  test("only organizers can undo a check-in", async () => {
    await checkIn(volunteerC);
    expect((await checkIn(volunteerC, { checkInStatus: false })).status).toBe(403);
    const undo = await checkIn(ownerC, { checkInStatus: false });
    expect(undo.status).toBe(200);
    expect(undo.body.data.checkedInAt).toBeUndefined();
  });

  test("organizer cancellation keeps the record and frees the seat", async () => {
    const res = await ownerC.delete(`/api/campus/registrations/${ticketId}`);
    expect(res.body.data).toMatchObject({ status: "cancelled", cancelReason: "organizer" });
    expect(await Registration.countDocuments({ ticketId })).toBe(1);
    expect(await seats(event._id)).toBe(50);
  });
});
