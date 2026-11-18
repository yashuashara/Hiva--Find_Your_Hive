const h = require("./helpers");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

let app, admin;
beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000, apiRateLimit: 10000 });
});
beforeEach(async () => {
  admin = await h.loggedInClient(app, await h.createUser({ email: "admin@example.com", role: "super_admin" }));
});
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

const makeEvent = (capacity = 50, entryFee = 0) =>
  Event.create({ _id: "EVT1", ...h.sampleEvent({ capacity, entryFee }), seatsAvailable: capacity });

const register = (i, extra = {}) =>
  admin.post("/api/campus/registrations").send({ eventId: "EVT1", ...h.sampleStudent(i), ...extra });

describe("access control", () => {
  test("student data is not visible to anonymous users or students", async () => {
    await makeEvent();
    const student = await h.loggedInClient(app, await h.createUser({ email: "s@example.com" }));
    for (const c of [h.client(app), student]) {
      const expected = c === student ? 403 : 401;
      expect((await c.get("/api/campus/registrations")).status).toBe(expected);
      expect((await c.get("/api/campus/registrations/event/EVT1")).status).toBe(expected);
      expect((await c.post("/api/campus/registrations").send({ eventId: "EVT1", ...h.sampleStudent(1) })).status).toBe(expected);
    }
  });
});

describe("registration", () => {
  test("creates a registration with a server-generated, unguessable ticket ID", async () => {
    await makeEvent(10);
    const res = await register(1, { ticketId: "TICK-2026-001" });
    expect(res.status).toBe(201);
    expect(res.body.data.ticketId).toMatch(/^TKT-[A-Za-z0-9_-]{22}$/);
    expect((await Event.findById("EVT1")).seatsAvailable).toBe(9);
  });

  test("ticket IDs are unique across many registrations", async () => {
    await makeEvent(100);
    const ids = new Set();
    for (let i = 0; i < 30; i++) ids.add((await register(i)).body.data.ticketId);
    expect(ids.size).toBe(30);
  });

  test("the same student cannot register twice", async () => {
    await makeEvent(10);
    expect((await register(1)).status).toBe(201);
    const again = await register(1, { studentName: "Different Name" });
    expect(again.status).toBe(409);
    expect(await Registration.countDocuments()).toBe(1);
    expect((await Event.findById("EVT1")).seatsAvailable).toBe(9);
  });

  test("full events reject registrations", async () => {
    await makeEvent(1);
    expect((await register(1)).status).toBe(201);
    const res = await register(2);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/full/i);
  });

  test("CONCURRENCY: 25 simultaneous registrations for 5 seats never oversell", async () => {
    await makeEvent(5);
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => register(i)));
    const created = results.filter((r) => r.status === 201).length;
    const rejected = results.filter((r) => r.status === 409).length;

    expect(created).toBe(5);
    expect(rejected).toBe(20);
    expect(await Registration.countDocuments({ eventId: "EVT1" })).toBe(5);
    expect((await Event.findById("EVT1")).seatsAvailable).toBe(0);
  });

  test("CONCURRENCY: the same student registering 10 times at once gets exactly one ticket", async () => {
    await makeEvent(50);
    const results = await Promise.all(Array.from({ length: 10 }, () => register(7)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await Registration.countDocuments()).toBe(1);
    expect((await Event.findById("EVT1")).seatsAvailable).toBe(49); // reserved seats were released
  });

  test("clients cannot mark a registration as paid", async () => {
    await makeEvent(10, 200);
    const res = await register(1, {
      paymentMethod: "UPI",
      paymentDetails: { method: "UPI", amountPaid: 200, status: "Completed" },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.paymentDetails).toMatchObject({ method: "UPI", status: "Pending", amountPaid: 0 });
  });

  test("free events are recorded as free and complete", async () => {
    await makeEvent(10, 0);
    const res = await register(1);
    expect(res.body.data.paymentDetails).toMatchObject({ method: "Free", status: "Completed", amountPaid: 0 });
  });

  test("deleting a registration releases its seat (but never above capacity)", async () => {
    await makeEvent(10);
    const { ticketId } = (await register(1)).body.data;
    expect((await admin.delete(`/api/campus/registrations/${ticketId}`)).status).toBe(200);
    expect((await Event.findById("EVT1")).seatsAvailable).toBe(10);
    expect((await admin.delete(`/api/campus/registrations/${ticketId}`)).status).toBe(404);
  });
});

describe("check-in", () => {
  test("checks in once, records who and when, and rejects a second check-in", async () => {
    await makeEvent(10);
    const { ticketId } = (await register(1)).body.data;

    const first = await admin.put(`/api/campus/registrations/${ticketId}`).send({ checkInStatus: true });
    expect(first.status).toBe(200);
    expect(first.body.data.checkInStatus).toBe(true);
    expect(first.body.data.checkedInAt).toBeTruthy();
    expect(first.body.data.checkedInBy).toBeTruthy();

    const second = await admin.put(`/api/campus/registrations/${ticketId}`).send({ checkInStatus: true });
    expect(second.status).toBe(409);
  });

  test("CONCURRENCY: two simultaneous scans of one ticket — exactly one succeeds", async () => {
    await makeEvent(10);
    const { ticketId } = (await register(1)).body.data;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => admin.put(`/api/campus/registrations/${ticketId}`).send({ checkInStatus: true }))
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
  });

  test("only checkInStatus can be changed through the update endpoint", async () => {
    await makeEvent(10, 100);
    const { ticketId } = (await register(1)).body.data;
    const res = await admin
      .put(`/api/campus/registrations/${ticketId}`)
      .send({ checkInStatus: true, paymentDetails: { status: "Completed" }, studentName: "Changed" });
    expect(res.status).toBe(200);
    expect(res.body.data.paymentDetails.status).toBe("Pending");
    expect(res.body.data.studentName).toBe("Student 1");
  });

  test("an admin can undo a mistaken check-in; unknown tickets 404", async () => {
    await makeEvent(10);
    const { ticketId } = (await register(1)).body.data;
    await admin.put(`/api/campus/registrations/${ticketId}`).send({ checkInStatus: true });
    const undo = await admin.put(`/api/campus/registrations/${ticketId}`).send({ checkInStatus: false });
    expect(undo.status).toBe(200);
    expect(undo.body.data.checkedInAt).toBeUndefined();
    expect((await admin.put("/api/campus/registrations/TKT-nope").send({ checkInStatus: true })).status).toBe(404);
  });
});
