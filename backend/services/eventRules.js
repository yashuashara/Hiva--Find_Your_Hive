// Business rules for events and seats, shared by the event and registration
// controllers.
const Event = require("../models/Event");
const AppError = require("../utils/AppError");

// Events the public may see.
const PUBLIC_STATUSES = ["published", "completed"];
// Events whose details can still be edited.
const EDITABLE_STATUSES = ["draft", "rejected", "approved", "published"];

// Lifecycle transitions: which states each action starts from, where it leads,
// and which ability it needs (see services/permissions.js).
const TRANSITIONS = {
  submit: { from: ["draft", "rejected"], to: "pending_approval", ability: "manageEvents" },
  withdraw: { from: ["pending_approval"], to: "draft", ability: "manageEvents" },
  approve: { from: ["pending_approval"], to: "approved", ability: "review" },
  reject: { from: ["pending_approval"], to: "rejected", ability: "review", needsReason: true },
  publish: { from: ["approved"], to: "published", ability: "manageEvents" },
  cancel: { from: ["draft", "pending_approval", "approved", "published"], to: "cancelled", ability: "manageEvents", needsReason: true },
  complete: { from: ["published"], to: "completed", ability: "manageEvents" },
};

// Returns a list of human-readable problems with an event's dates.
function scheduleProblems(e) {
  const problems = [];
  if (e.startsAt && e.endsAt && e.endsAt <= e.startsAt) problems.push("The event must end after it starts.");
  if (e.registrationOpensAt && e.registrationClosesAt && e.registrationOpensAt >= e.registrationClosesAt) {
    problems.push("Registration must open before it closes.");
  }
  if (e.registrationClosesAt && e.endsAt && e.registrationClosesAt > e.endsAt) {
    problems.push("Registration must close before the event ends.");
  }
  if (e.registrationOpensAt && e.startsAt && e.registrationOpensAt >= e.startsAt) {
    problems.push("Registration must open before the event starts.");
  }
  return problems;
}

function assertValidSchedule(e) {
  const problems = scheduleProblems(e);
  if (problems.length) throw new AppError(400, problems.join(" "));
}

// Extra checks before a transition is allowed.
function assertTransitionAllowed(action, event, now = new Date()) {
  if (action === "submit") {
    if (!event.startsAt || !event.endsAt) throw new AppError(400, "Add a start and end time before submitting.");
    if (event.startsAt <= now) throw new AppError(400, "The event start time is in the past. Update the date first.");
    assertValidSchedule(event);
  }
  if (action === "publish" && event.endsAt && event.endsAt <= now) {
    throw new AppError(400, "This event has already ended and cannot be published.");
  }
  if (action === "complete" && event.endsAt && event.endsAt > now) {
    throw new AppError(400, "An event can only be marked completed after it ends.");
  }
}

// When students may register on their own (organizers can add walk-ins
// outside this window).
function registrationWindowError(event, now = new Date()) {
  if (event.status !== "published") return "Registration is not open for this event.";
  if (event.registrationOpensAt && now < event.registrationOpensAt) return "Registration has not opened yet.";
  const closesAt = event.registrationClosesAt || event.startsAt;
  if (closesAt && now >= closesAt) return "Registration for this event has closed.";
  return null;
}

// Atomically takes one seat. Returns the updated event, or throws if full.
async function reserveSeat(eventId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, seatsAvailable: { $gt: 0 } },
    { $inc: { seatsAvailable: -1 } },
    { new: true }
  );
  if (!event) throw new AppError(409, "This event is full");
  return event;
}

// Gives a seat back, never raising seatsAvailable above capacity.
function releaseSeat(eventId) {
  return Event.updateOne(
    { _id: eventId, $expr: { $lt: ["$seatsAvailable", "$capacity"] } },
    { $inc: { seatsAvailable: 1 } }
  );
}

module.exports = {
  PUBLIC_STATUSES,
  EDITABLE_STATUSES,
  TRANSITIONS,
  scheduleProblems,
  assertValidSchedule,
  assertTransitionAllowed,
  registrationWindowError,
  reserveSeat,
  releaseSeat,
};
