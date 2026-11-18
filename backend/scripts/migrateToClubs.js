// Migration 003: moves pre-club data onto the club / lifecycle model.
// Additive and idempotent: it only fills in missing fields and creates clubs;
// it never deletes events or registrations. Safe to run more than once.
//
//   npm run migrate:clubs              (dry run: shows what would change)
//   npm run migrate:clubs -- --apply   (makes the changes)
//
// What it does:
//  1. Ensures the default university exists.
//  2. Links users without a university to it.
//  3. Creates an approved club for each distinct "organizerClub" name used by
//     events that have no club yet, and links those events to it.
//  4. Marks events without a status as "published" (they were already public).
//  5. Marks registrations without a status as "confirmed".
//  6. Syncs indexes: replaces the old (eventId, studentId) unique index with
//     the new "one ACTIVE registration" partial index, adds the new indexes.
const mongoose = require("mongoose");
const config = require("../config/env");
const connectDB = require("../config/EventDB");
const University = require("../models/University");
const User = require("../models/User");
const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const AuditLog = require("../models/AuditLog");
const { getDefaultUniversity } = require("../services/university");

const apply = process.argv.includes("--apply");
const CATEGORY_MAP = { Technical: "Technical", Cultural: "Cultural", Sports: "Sports", Workshop: "Academic", Seminar: "Academic" };

const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "club";
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const step = (msg) => console.log(`\n▶ ${msg}`);

async function main() {
  await connectDB(config.mongoUri);
  console.log(apply ? "APPLYING changes" : "DRY RUN (no changes will be made; pass --apply to migrate)");

  step("University");
  let university = await University.findOne({ slug: config.defaultUniversity.slug });
  if (university) console.log(`  exists: ${university.name}`);
  else if (apply) {
    university = await getDefaultUniversity();
    console.log(`  created: ${university.name}`);
  } else console.log(`  would create: ${config.defaultUniversity.name}`);
  const universityId = university?._id;

  step("Users without a university");
  const usersMissing = await User.countDocuments({ university: { $exists: false } });
  console.log(`  ${usersMissing} user(s)`);
  if (apply && usersMissing) await User.updateMany({ university: { $exists: false } }, { $set: { university: universityId } });

  step("Clubs for events without a club");
  const names = await Event.distinct("organizerClub", { club: { $exists: false } });
  for (const name of names) {
    const sample = await Event.findOne({ club: { $exists: false }, organizerClub: name }).select("category").lean();
    const count = await Event.countDocuments({ club: { $exists: false }, organizerClub: name });
    let club = universityId
      ? await Club.findOne({ university: universityId, name: new RegExp(`^${escapeRegex(name)}$`, "i") })
      : null;
    if (!club && apply) {
      let slug = slugify(name);
      for (let i = 2; await Club.exists({ university: universityId, slug }); i++) slug = `${slugify(name)}-${i}`;
      club = await Club.create({
        university: universityId,
        name,
        slug,
        category: CATEGORY_MAP[sample?.category] || "Other",
        status: "approved",
        description: "",
      });
      await AuditLog.create({ action: "club.migrate_create", targetType: "Club", targetId: String(club._id), meta: { name } });
    }
    console.log(`  "${name}": ${club ? "club " + club.slug : "would create club"} ← ${count} event(s)`);
    if (apply) {
      await Event.updateMany(
        { club: { $exists: false }, organizerClub: name },
        { $set: { club: club._id, university: universityId } }
      );
    }
  }
  if (!names.length) console.log("  none");

  step("Events without a lifecycle status → published");
  const eventsMissing = await Event.countDocuments({ status: { $exists: false } });
  console.log(`  ${eventsMissing} event(s)`);
  if (apply && eventsMissing) await Event.updateMany({ status: { $exists: false } }, { $set: { status: "published" } });

  step("Registrations without a status → confirmed");
  const regsMissing = await Registration.countDocuments({ status: { $exists: false } });
  console.log(`  ${regsMissing} registration(s)`);
  if (apply && regsMissing) await Registration.updateMany({ status: { $exists: false } }, { $set: { status: "confirmed" } });

  step("Indexes");
  for (const Model of [University, User, Club, ClubMembership, Event, Registration, AuditLog]) {
    const diff = await Model.diffIndexes().catch(() => ({ toDrop: [], toCreate: [] }));
    const toCreate = diff.toCreate.map((i) => JSON.stringify(i.key || i));
    if (!diff.toDrop.length && !toCreate.length) continue;
    console.log(`  ${Model.modelName}: drop [${diff.toDrop.join(", ")}] create [${toCreate.join(", ")}]`);
    if (apply) await Model.syncIndexes();
  }

  console.log(apply ? "\n✅ Migration complete." : "\nDry run finished. Re-run with --apply to migrate.");
}

main()
  .catch((err) => {
    console.error("❌", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
