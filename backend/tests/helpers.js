// Shared test setup: an in-memory MongoDB per test file, plus helpers to
// create users and logged-in HTTP clients.
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const createApp = require("../app");
const User = require("../models/User");
require("../models/Event");
require("../models/Registration");
const { hashPassword } = require("../utils/password");

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
    delete: withHeader("delete"),
    raw: agent,
  };
}

const PASSWORD = "correct-horse-battery";

async function createUser({ email, role = "student", name = "Test User", status = "active" }) {
  return User.create({ email, name, role, status, passwordHash: await hashPassword(PASSWORD) });
}

async function loggedInClient(app, user) {
  const c = client(app);
  const res = await c.post("/api/auth/login").send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return c;
}

const sampleEvent = (overrides = {}) => ({
  title: "HackCampus",
  category: "Technical",
  organizerClub: "Coding Club",
  venue: "Auditorium A",
  capacity: 50,
  entryFee: 0,
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
  loggedInClient,
  sampleEvent,
  sampleStudent,
  PASSWORD,
};
