const h = require("./helpers");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
const { encodeTicket, parseTicketCode } = require("../services/ticketCode");
const { outbox } = require("../services/email");

let app, club, owner, volunteer, volunteerC, event;
beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000, apiRateLimit: 100000 });
});
beforeEach(async () => {
  owner = await h.createUser();
  volunteer = await h.createUser();
  club = await h.createClub({ owner, volunteers: [volunteer] });
  volunteerC = await h.loggedInClient(app, volunteer);
  event = await h.createEvent(club);
  outbox.length = 0;
});
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

async function registerStudent(ev = event, name = "Asha Patil") {
  const student = await h.createStudent({ name });
  const sc = await h.loggedInClient(app, student);
  const res = await sc.post(`/api/campus/events/${ev._id}/register`).send({});
  return { student, sc, ticketId: res.body.data.ticketId };
}
const scan = (c, code, ev = event) => c.post(`/api/campus/events/${ev._id}/check-in`).send({ code });
const waitForEmail = async (n = 1) => {
  for (let i = 0; i < 50 && outbox.length < n; i++) await new Promise((r) => setTimeout(r, 20));
};

describe("ticket codes", () => {
  test("QR payload contains only the ticket ID", () => {
    expect(encodeTicket("TKT-abc")).toBe("HIVA:TKT-abc");
    expect(parseTicketCode("HIVA:TKT-abc")).toBe("TKT-abc");
    expect(parseTicketCode("  hiva:TKT-abc ")).toBe("TKT-abc");
    expect(parseTicketCode("TKT-abc")).toBe("TKT-abc"); // typed by hand
    expect(parseTicketCode("https://evil.example/?x=1")).toBeNull();
    expect(parseTicketCode('{"$gt":""}')).toBeNull();
  });

  test("tickets issued before the rename (EETKT: prefix) still parse", () => {
    expect(parseTicketCode("EETKT:TKT-abc")).toBe("TKT-abc");
    expect(parseTicketCode("  eetkt:TKT-abc ")).toBe("TKT-abc");
  });
});

describe("scanning at the door", () => {
  test("valid ticket: checks in and returns the attendee and live counts", async () => {
    const { ticketId } = await registerStudent();
    const res = await scan(volunteerC, encodeTicket(ticketId));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      code: "OK",
      attendee: { name: "Asha Patil" },
      stats: { registered: 1, checkedIn: 1 },
    });
    const reg = await Registration.findOne({ ticketId });
    expect(String(reg.checkedInBy)).toBe(String(volunteer._id));
  });

  test("second scan reports ALREADY_CHECKED_IN with the original time", async () => {
    const { ticketId } = await registerStudent();
    const first = await scan(volunteerC, encodeTicket(ticketId));
    const second = await scan(volunteerC, encodeTicket(ticketId));
    expect(second.status).toBe(409);
    expect(second.body.details).toMatchObject({ code: "ALREADY_CHECKED_IN", attendee: { name: "Asha Patil" } });
    expect(second.body.details.checkedInAt).toBe(first.body.data.checkedInAt);
  });

  test("simultaneous scans at two doors: exactly one succeeds", async () => {
    const { ticketId } = await registerStudent();
    const otherVolunteer = await h.createUser();
    await require("../models/ClubMembership").create({ club: club._id, user: otherVolunteer._id, role: "volunteer", status: "active" });
    const otherC = await h.loggedInClient(app, otherVolunteer);
    const results = await Promise.all([
      ...Array.from({ length: 3 }, () => scan(volunteerC, encodeTicket(ticketId))),
      ...Array.from({ length: 3 }, () => scan(otherC, encodeTicket(ticketId))),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.body.details?.code === "ALREADY_CHECKED_IN")).toHaveLength(5);
  });

  test("garbage, unknown, cancelled and other-event tickets are rejected with clear codes", async () => {
    expect((await scan(volunteerC, "hello world")).body.details.code).toBe("INVALID_CODE");
    expect((await scan(volunteerC, encodeTicket("TKT-doesnotexist000000000"))).body.details.code).toBe("NOT_FOUND");

    const { sc, ticketId } = await registerStudent();
    await sc.post(`/api/me/registrations/${ticketId}/cancel`).send({});
    const cancelled = await scan(volunteerC, encodeTicket(ticketId));
    expect(cancelled.body.details).toMatchObject({ code: "CANCELLED", attendee: { name: "Asha Patil" } });

    const otherEvent = await h.createEvent(club);
    const other = await registerStudent(otherEvent, "Kabir");
    const wrong = await scan(volunteerC, encodeTicket(other.ticketId));
    expect(wrong.body.details.code).toBe("WRONG_EVENT");
    expect(wrong.body.details.attendee).toBeUndefined(); // no data about other events' attendees
  });

  test("expired and cancelled events reject scans", async () => {
    const { ticketId } = await registerStudent();
    await Event.updateOne({ _id: event._id }, { startsAt: h.inHours(-30), endsAt: h.inHours(-20) });
    expect((await scan(volunteerC, ticketId)).body.details.code).toBe("EXPIRED");

    const ev2 = await h.createEvent(club);
    const t2 = await registerStudent(ev2, "Meera");
    await Event.updateOne({ _id: ev2._id }, { status: "cancelled" });
    expect((await scan(volunteerC, t2.ticketId, ev2)).body.details.code).toBe("EVENT_CANCELLED");
  });

  test("only the event's club team (and admins) can scan; nobody else learns anything", async () => {
    const { ticketId, sc } = await registerStudent();
    expect((await scan(sc, encodeTicket(ticketId))).status).toBe(403); // the ticket holder themselves
    const otherClubVolunteer = await h.createUser();
    await h.createClub({ volunteers: [otherClubVolunteer] });
    const oc = await h.loggedInClient(app, otherClubVolunteer);
    expect((await scan(oc, encodeTicket(ticketId))).status).toBe(403);
    expect((await scan(h.client(app), encodeTicket(ticketId))).status).toBe(401);
    expect((await Registration.findOne({ ticketId })).checkInStatus).toBe(false);
  });

  test("attendance endpoint shows live counts and recent check-ins to the team only", async () => {
    const a = await registerStudent(event, "Asha");
    await registerStudent(event, "Kabir");
    await scan(volunteerC, a.ticketId);
    const res = await volunteerC.get(`/api/campus/events/${event._id}/attendance`);
    expect(res.body.data).toMatchObject({ registered: 2, checkedIn: 1, capacity: 50, recent: [{ name: "Asha" }] });
    const student = await h.loggedInClient(app, await h.createUser());
    expect((await student.get(`/api/campus/events/${event._id}/attendance`)).status).toBe(403);
  });
});

describe("rate limiting", () => {
  test("signed-in users are limited individually, not per shared IP", async () => {
    const strictApp = h.createApp({ authRateLimit: 1000, apiRateLimit: 5 });
    const a = await h.loggedInClient(strictApp, await h.createUser());
    const b = await h.loggedInClient(strictApp, await h.createUser());
    // limit = 5 requests per window for each signed-in user
    for (let i = 0; i < 5; i++) expect((await a.get("/api/auth/me")).status).toBe(200);
    expect((await a.get("/api/auth/me")).status).toBe(429);
    // Same IP (all test traffic is 127.0.0.1), different user: still allowed
    expect((await b.get("/api/auth/me")).status).toBe(200);
  });
});

describe("email", () => {
  test("self-registration sends a confirmation with the ticket ID; HTML is escaped", async () => {
    await Event.updateOne({ _id: event._id }, { title: "<script>alert(1)</script> Night" });
    const { student, ticketId } = await registerStudent();
    await waitForEmail();
    expect(outbox).toHaveLength(1);
    const mail = outbox[0];
    expect(mail.to).toBe(student.email);
    expect(mail.text).toContain(ticketId);
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
  });

  test("cancelling an event emails registered students", async () => {
    await registerStudent(event, "Asha");
    await registerStudent(event, "Kabir");
    await waitForEmail(2);
    outbox.length = 0;
    const ownerC = await h.loggedInClient(app, owner);
    await ownerC.post(`/api/campus/events/${event._id}/cancel`).send({ reason: "Heavy rain" });
    await waitForEmail(2);
    expect(outbox).toHaveLength(2);
    expect(outbox[0].subject).toMatch(/^Cancelled:/);
    expect(outbox[0].text).toContain("Heavy rain");
  });
});
