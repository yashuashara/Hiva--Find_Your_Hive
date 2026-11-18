// Recomputes each event's seatsAvailable from its actual active registrations:
//   seatsAvailable = capacity - (registrations that are not cancelled)
//
// Dry run by default (prints what would change):
//   npm run reconcile-seats
// Apply the changes:
//   npm run reconcile-seats -- --apply
//
// Each update only applies if seatsAvailable has not changed since it was read,
// so a registration that happens mid-run is never overwritten (re-run instead).
const mongoose = require("mongoose");
const config = require("../config/env");
const connectDB = require("../config/EventDB");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

const apply = process.argv.includes("--apply");

async function main() {
  await connectDB(config.mongoUri);
  const events = await Event.find().select("title capacity seatsAvailable").lean();
  let changed = 0;

  for (const ev of events) {
    const active = await Registration.countDocuments({ eventId: ev._id, status: { $ne: "cancelled" } });
    const correct = Math.max(0, ev.capacity - active);
    if (active > ev.capacity) {
      console.warn(`⚠️  ${ev._id} is overbooked: ${active} registrations for ${ev.capacity} seats`);
    }
    if (correct === ev.seatsAvailable) {
      console.log(`✓ ${ev._id} "${ev.title}": ${ev.seatsAvailable} seats left (correct)`);
      continue;
    }
    changed++;
    console.log(`✗ ${ev._id} "${ev.title}": stored ${ev.seatsAvailable}, should be ${correct} (capacity ${ev.capacity}, ${active} registered)`);
    if (apply) {
      const res = await Event.updateOne(
        { _id: ev._id, seatsAvailable: ev.seatsAvailable },
        { $set: { seatsAvailable: correct } }
      );
      console.log(res.modifiedCount ? "   → fixed" : "   → skipped (changed during run, re-run the script)");
    }
  }

  if (!apply && changed) console.log(`\n${changed} event(s) need fixing. Re-run with --apply to update them.`);
  if (!changed) console.log("\nAll seat counts are correct.");
}

main()
  .catch((err) => {
    console.error("❌", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
