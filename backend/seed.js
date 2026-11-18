// DEVELOPMENT SAMPLE DATA ONLY — for a fresh local database.
// This script DELETES all clubs, events and registrations before inserting
// samples, so it refuses to run unless you pass --reset, and never runs in
// production. User accounts are left untouched.
//   npm run seed -- --reset
//
// All names below are fictional sample data.
const crypto = require("crypto");
const mongoose = require("mongoose");
const config = require("./config/env");
const Club = require("./models/Club");
const ClubMembership = require("./models/ClubMembership");
const Event = require("./models/Event");
const Registration = require("./models/Registration");
const { getDefaultUniversity } = require("./services/university");

if (config.isProd) {
  console.error("❌ Refusing to seed sample data in production.");
  process.exit(1);
}
if (!process.argv.includes("--reset")) {
  console.error("❌ This deletes ALL clubs, events and registrations. Re-run with --reset to confirm:");
  console.error("   npm run seed -- --reset");
  process.exit(1);
}

const DAY = 24 * 60 * 60 * 1000;
const at = (days, hour) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const ticket = () => `TKT-${crypto.randomBytes(16).toString("base64url")}`;

const CLUBS = [
  { name: "Coding Club", category: "Technical", description: "Hackathons, coding contests and developer meetups." },
  { name: "Cultural Committee", category: "Cultural", description: "Music, dance and drama across campus." },
  { name: "Entrepreneurship Cell", category: "Entrepreneurship", description: "Startup talks, pitch days and founder workshops." },
  { name: "Photography Club", category: "Arts", description: "Photo walks, editing workshops and exhibitions." },
];

const EVENTS = [
  { club: 0, title: "HackCampus 2026", category: "Technical", venue: "Auditorium A", start: [14, 9], hours: 24, capacity: 200, tags: ["hackathon", "coding"], status: "published", regs: 35 },
  { club: 0, title: "Intro to Git & GitHub", category: "Workshop", venue: "Lab 3", start: [5, 14], hours: 2, capacity: 60, tags: ["git", "beginner"], status: "published", regs: 22 },
  { club: 1, title: "Annual Music Night", category: "Cultural", venue: "Open Air Theatre", start: [21, 18], hours: 4, capacity: 500, tags: ["music", "concert"], status: "published", regs: 40 },
  { club: 2, title: "Founder Fireside Chat", category: "Seminar", venue: "Seminar Hall 2", start: [9, 16], hours: 2, capacity: 120, tags: ["startups"], status: "pending_approval", regs: 0 },
  { club: 3, title: "Campus Photo Walk", category: "Workshop", venue: "Main Gate", start: [-10, 7], hours: 3, capacity: 40, tags: ["photography"], status: "completed", regs: 30, checkedIn: 24 },
  { club: 3, title: "Editing Masterclass", category: "Workshop", venue: "Lab 1", start: [30, 15], hours: 2, capacity: 50, tags: ["lightroom"], status: "draft", regs: 0 },
];

const FIRST = ["Aarav", "Diya", "Kabir", "Isha", "Vihaan", "Ananya", "Reyansh", "Meera", "Arjun", "Saanvi"];
const LAST = ["Sharma", "Patil", "Kulkarni", "Deshmukh", "Joshi", "Nair", "Iyer", "Gupta"];
const DEPTS = ["Computer Science", "Information Technology", "Electronics", "Mechanical Engineering", "Civil Engineering"];

const seedData = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("✅ Connected to MongoDB for seeding...");

    await Promise.all([Registration.deleteMany({}), Event.deleteMany({}), ClubMembership.deleteMany({}), Club.deleteMany({})]);
    console.log("✅ Cleared clubs, events and registrations.");

    const university = await getDefaultUniversity();
    const clubs = await Club.insertMany(
      CLUBS.map((c) => ({
        ...c,
        university: university._id,
        slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        status: "approved",
      }))
    );

    let studentNo = 0;
    for (const [i, e] of EVENTS.entries()) {
      const club = clubs[e.club];
      const startsAt = at(e.start[0], e.start[1]);
      const event = await Event.create({
        _id: `EVT${101 + i}`,
        title: e.title,
        description: `${e.title}, organized by ${club.name}.`,
        category: e.category,
        club: club._id,
        university: university._id,
        organizerClub: club.name,
        venue: e.venue,
        startsAt,
        endsAt: new Date(startsAt.getTime() + e.hours * 60 * 60 * 1000),
        capacity: e.capacity,
        seatsAvailable: e.capacity - e.regs,
        entryFee: 0,
        tags: e.tags,
        status: e.status,
        ...(["published", "completed"].includes(e.status) ? { publishedAt: new Date() } : {}),
      });

      const regs = Array.from({ length: e.regs }, (_, n) => {
        studentNo++;
        return {
          ticketId: ticket(),
          eventId: event._id,
          studentId: `SAMPLE${String(studentNo).padStart(4, "0")}`,
          studentName: `${FIRST[studentNo % FIRST.length]} ${LAST[studentNo % LAST.length]}`,
          department: DEPTS[studentNo % DEPTS.length],
          year: (studentNo % 4) + 1,
          status: "confirmed",
          checkInStatus: n < (e.checkedIn || 0),
          ...(n < (e.checkedIn || 0) ? { checkedInAt: startsAt } : {}),
          paymentDetails: { method: "Free", amountPaid: 0, status: "Completed" },
        };
      });
      if (regs.length) await Registration.insertMany(regs);
      console.log(`✅ ${event._id} ${e.title} (${e.status}, ${e.regs} registrations)`);
    }

    console.log("\nDone. Create your admin account with: npm run create-admin");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seedData();
