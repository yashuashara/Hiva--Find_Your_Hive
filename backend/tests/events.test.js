const h = require("./helpers");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

let app, admin, student, anon;
beforeAll(async () => {
  await h.startDb();
  app = h.createApp({ authRateLimit: 1000 });
});
beforeEach(async () => {
  admin = await h.loggedInClient(app, await h.createUser({ email: "admin@example.com", role: "uni_admin" }));
  student = await h.loggedInClient(app, await h.createUser({ email: "student@example.com" }));
  anon = h.client(app);
});
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

describe("event permissions", () => {
  test("anyone can list and view events", async () => {
    await Event.create({ _id: "EVT1", ...h.sampleEvent(), seatsAvailable: 50 });
    expect((await anon.get("/api/campus/events")).body.count).toBe(1);
    expect((await anon.get("/api/campus/events/EVT1")).status).toBe(200);
    expect((await anon.get("/api/campus/events/NOPE")).status).toBe(404);
  });

  test("anonymous users and students cannot create, edit or delete events", async () => {
    await Event.create({ _id: "EVT1", ...h.sampleEvent(), seatsAvailable: 50 });
    expect((await anon.post("/api/campus/events").send(h.sampleEvent())).status).toBe(401);
    expect((await student.post("/api/campus/events").send(h.sampleEvent())).status).toBe(403);
    expect((await student.put("/api/campus/events/EVT1").send({ venue: "Hacked" })).status).toBe(403);
    expect((await student.delete("/api/campus/events/EVT1")).status).toBe(403);
  });
});

describe("event creation and updates", () => {
  test("admin creates an event; seatsAvailable comes from capacity, not the client", async () => {
    const res = await admin.post("/api/campus/events").send({ ...h.sampleEvent({ capacity: 30 }), seatsAvailable: 9999 });
    expect(res.status).toBe(201);
    expect(res.body.data._id).toMatch(/^EVT-/);
    expect(res.body.data.seatsAvailable).toBe(30);
  });

  test("invalid input is rejected with field details", async () => {
    const res = await admin.post("/api/campus/events").send(h.sampleEvent({ category: "Party", capacity: -1 }));
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["category", "capacity"]));
  });

  test("raising capacity adds seats; lowering below bookings is refused", async () => {
    await Event.create({ _id: "EVT1", ...h.sampleEvent({ capacity: 10 }), seatsAvailable: 2 }); // 8 booked
    let res = await admin.put("/api/campus/events/EVT1").send({ capacity: 15 });
    expect(res.body.data).toMatchObject({ capacity: 15, seatsAvailable: 7 });

    res = await admin.put("/api/campus/events/EVT1").send({ capacity: 7 });
    expect(res.status).toBe(409);
    expect((await Event.findById("EVT1")).capacity).toBe(15);
  });

  test("updates cannot touch seatsAvailable directly", async () => {
    await Event.create({ _id: "EVT1", ...h.sampleEvent({ capacity: 10 }), seatsAvailable: 10 });
    await admin.put("/api/campus/events/EVT1").send({ venue: "Hall B", seatsAvailable: 1000 });
    expect((await Event.findById("EVT1")).toObject()).toMatchObject({ venue: "Hall B", seatsAvailable: 10 });
  });

  test("events with registrations cannot be deleted", async () => {
    await Event.create({ _id: "EVT1", ...h.sampleEvent(), seatsAvailable: 50 });
    await admin.post("/api/campus/registrations").send({ eventId: "EVT1", ...h.sampleStudent(1) });
    expect((await admin.delete("/api/campus/events/EVT1")).status).toBe(409);

    await Registration.deleteMany({});
    expect((await admin.delete("/api/campus/events/EVT1")).status).toBe(200);
  });
});
