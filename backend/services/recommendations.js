// "Recommended for you": a simple, explainable score instead of a black box.
//   +3  the event is by a club the student follows
//   +2  the event's category matches one the student has registered for
//   +0..1 popularity (how full the event already is)
//   +0..0.5 soonness (sooner events rank slightly higher)
// Only upcoming, published events with seats and open registration that the
// student has not already registered for are considered.
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const ClubFollow = require("../models/ClubFollow");
const { registrationWindowError } = require("./eventRules");

const WEEK = 7 * 24 * 60 * 60 * 1000;

async function recommendEvents(user, limit = 6) {
  const now = new Date();
  const [myRegs, follows] = await Promise.all([
    Registration.find({ userId: user._id }).select("eventId status").lean(),
    ClubFollow.find({ user: user._id }).select("club").lean(),
  ]);
  const registeredIds = new Set(myRegs.filter((r) => r.status === "confirmed").map((r) => r.eventId));
  const followed = new Set(follows.map((f) => String(f.club)));
  const pastEvents = myRegs.length
    ? await Event.find({ _id: { $in: myRegs.map((r) => r.eventId) } }).select("category").lean()
    : [];
  const likedCategories = new Set(pastEvents.map((e) => e.category));

  const candidates = await Event.find({
    status: "published",
    startsAt: { $gt: now },
    seatsAvailable: { $gt: 0 },
    _id: { $nin: [...registeredIds] },
  })
    .sort({ startsAt: 1 })
    .limit(200)
    .populate("club", "name slug logoUrl")
    .lean();

  const scored = candidates
    .filter((e) => !registrationWindowError(e, now))
    .map((e) => {
      const reasons = [];
      let score = 0;
      if (e.club && followed.has(String(e.club._id))) {
        score += 3;
        reasons.push("followed_club");
      }
      if (likedCategories.has(e.category)) {
        score += 2;
        reasons.push("category");
      }
      score += (e.capacity - e.seatsAvailable) / e.capacity;
      score += Math.max(0, 0.5 - (e.startsAt - now) / (4 * WEEK));
      return { ...e, recommendation: { score: Math.round(score * 100) / 100, reasons } };
    });

  scored.sort((a, b) => b.recommendation.score - a.recommendation.score);
  return scored.slice(0, limit);
}

module.exports = { recommendEvents };
