// Shared test setup: a throwaway database per test file, plus helpers to
// create users, clubs, events and logged-in HTTP clients.
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const createApp = require("../app");
const User = require("../models/User");
const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const Event = require("../models/Event");
require("../models/Registration");
require("../models/University");
require("../models/AuditLog");
require("../models/ClubFollow");
const { hashPassword } = require("../utils/password");
const { getDefaultUniversity } = require("../services/university");

let mongod;

// By default each test file gets a throwaway in-memory MongoDB.
// Set MONGO_TEST_URI (e.g. mongodb://127.0.0.1:27017) to use an existing
// server instead; each file then uses its own uniquely named database that is
// dropped afterwards, so real databases are never touched.
async function startDb() {
  const base = process.env.MONGO_TEST_URI;
  if (base) {
    const dbName = `ee_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await mongoose.connect(base, { dbName });
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
  // Make sure unique indexes exist before tests rely on them.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

async function stopDb() {
  if (process.env.MONGO_TEST_URI && mongoose.connection.name.startsWith("ee_test_")) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function clearDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

// Wraps a supertest agent so every request sends the CSRF header and keeps
// the session cookie between calls.
function client(app) {
  const agent = request.agent(app);
  const withHeader = (method) => (url) => agent[method](url).set("X-Requested-With", "XMLHttpRequest");
  return {
    get: withHeader("get"),
    post: withHeader("post"),
    put: withHeader("put"),
    patch: withHeader("patch"),
    delete: withHeader("delete"),
    raw: agent,
  };
}

const PASSWORD = "correct-horse-battery";
let userCounter = 0;

async function createUser({ email, role = "student", name = "Test User", status = "active", profile } = {}) {
  const university = await getDefaultUniversity();
  return User.create({
    email: email || `user${++userCounter}@example.com`,
    name,
    role,
    status,
    profile,
    university: university._id,
    passwordHash: await hashPassword(PASSWORD),
  });
}

// A student with a complete profile, ready to self-register.
let prnCounter = 1000;
const createStudent = (overrides = {}) =>
  createUser({
    name: "Student Person",
    profile: { prn: `PRN${++prnCounter}`, department: "Computer Science", year: 2 },
    ...overrides,
  });

async function loggedInClient(app, user) {
  const c = client(app);
  const res = await c.post("/api/auth/login").send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return c;
}

// Creates a club and active memberships: createClub({ owner: user, organizers: [user], volunteers: [user] })
let clubCounter = 0;
async function createClub({ name, status = "approved", owner, organizers = [], volunteers = [] } = {}) {
  const university = await getDefaultUniversity();
  const n = ++clubCounter;
  const club = await Club.create({
    university: university._id,
    name: name || `Club ${n}`,
    slug: `club-${n}`,
    status,
    category: "Technical",
  });
  const add = (user, role) => ClubMembership.create({ club: club._id, user: user._id, role, status: "active" });
  if (owner) await add(owner, "owner");
  for (const u of organizers) await add(u, "organizer");
  for (const u of volunteers) await add(u, "volunteer");
  return club;
}

const HOUR = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * HOUR);

// Inserts an event directly (bypassing the API). Defaults to a published
// event tomorrow with open registration.
let eventCounter = 0;
async function createEvent(club, overrides = {}) {
  const capacity = overrides.capacity ?? 50;
  return Event.create({
    _id: `EVT${++eventCounter}`,
    title: "HackCampus",
    category: "Technical",
    venue: "Auditorium A",
    organizerClub: club.name,
    club: club._id,
    university: club.university,
    status: "published",
    startsAt: inHours(24),
    endsAt: inHours(26),
    entryFee: 0,
    capacity,
    seatsAvailable: capacity,
    ...overrides,
  });
}

// Request body for POST /api/campus/events
const eventBody = (club, overrides = {}) => ({
  clubId: String(club._id),
  title: "HackCampus",
  category: "Technical",
  venue: "Auditorium A",
  capacity: 50,
  entryFee: 0,
  startsAt: inHours(48).toISOString(),
  endsAt: inHours(50).toISOString(),
  ...overrides,
});

const sampleStudent = (i = 1, overrides = {}) => ({
  studentId: `STU${String(i).padStart(4, "0")}`,
  studentName: `Student ${i}`,
  department: "Computer Science",
  year: 2,
  ...overrides,
});

module.exports = {
  createApp,
  startDb,
  stopDb,
  clearDb,
  client,
  createUser,
  createStudent,
  loggedInClient,
  createClub,
  createEvent,
  eventBody,
  sampleStudent,
  inHours,
  PASSWORD,
};
