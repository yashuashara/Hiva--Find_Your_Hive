const crypto = require("crypto");
const Event = require("../models/Event");
const Club = require("../models/Club");
const Registration = require("../models/Registration");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { sendEventCancelled } = require("../services/email");
const asyncHandler = require("../utils/asyncHandler");
const { audit } = require("../services/audit");
const { clubRoleOf, eventRoleOf, can, isPlatformAdmin, activeClubIds } = require("../services/permissions");
const { loadEventFor } = require("../services/eventAccess");
const {
  PUBLIC_STATUSES,
  EDITABLE_STATUSES,
  TRANSITIONS,
  assertValidSchedule,
  assertTransitionAllowed,
} = require("../services/eventRules");

const newEventId = () => `EVT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CLUB_FIELDS = "name slug logoUrl";

const paginate = (page, limit, total) => ({ page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });

// ==================== PUBLIC ====================

// GET /events — public discovery with search, filters and pagination.
// Only published/completed events are ever returned here.
const listEvents = asyncHandler(async (req, res) => {
  const { q, category, club, when, price, from, to, page, limit } = req.validatedQuery;
  const now = new Date();
  const and = [{ status: { $in: PUBLIC_STATUSES } }];

  if (when === "upcoming") {
    and.push({ status: "published" }, { $or: [{ endsAt: { $gte: now } }, { endsAt: null }] });
  } else if (when === "past") {
    and.push({ $or: [{ status: "completed" }, { endsAt: { $lt: now } }] });
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    and.push({ $or: [{ title: rx }, { organizerClub: rx }, { tags: rx }, { venue: rx }] });
  }
  if (category) and.push({ category });
  if (price === "free") and.push({ entryFee: 0 });
  if (price === "paid") and.push({ entryFee: { $gt: 0 } });
  if (from || to) {
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    and.push({ startsAt: range });
  }
  if (club) {
    const found = await Club.findOne({ slug: club, status: "approved" }).select("_id").lean();
    if (!found) {
      return res.json({ success: true, count: 0, data: [], pagination: paginate(page, limit, 0) });
    }
    and.push({ club: found._id });
  }

  const filter = { $and: and };
  const sort = when === "upcoming" ? { startsAt: 1, _id: 1 } : { startsAt: -1, _id: 1 };
  const [total, events] = await Promise.all([
    Event.countDocuments(filter),
    Event.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate("club", CLUB_FIELDS).lean(),
  ]);

  res.json({ success: true, count: events.length, data: events, pagination: paginate(page, limit, total) });
});

// GET /events/:id — public for published/completed events; otherwise only
// for people who manage the event. Includes what the viewer may do.
const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate("club", CLUB_FIELDS + " status").lean();
  if (!event) throw new AppError(404, "Event not found");

  const role = await eventRoleOf(req.user, event);
  if (!PUBLIC_STATUSES.includes(event.status) && !role) throw new AppError(404, "Event not found");

  let myRegistration = null;
  if (req.user) {
    myRegistration = await Registration.findOne({ eventId: event._id, userId: req.user._id, status: "confirmed" })
      .select("ticketId status checkInStatus registrationDate")
      .lean();
  }

  res.json({
    success: true,
    data: event,
    viewer: {
      role,
      canManage: can(role, "manageEvents"),
      canReview: can(role, "review"),
      canViewAttendees: can(role, "viewAttendees"),
      canCheckIn: can(role, "checkIn"),
      registration: myRegistration,
    },
  });
});

// ==================== MANAGEMENT ====================

// GET /manage/events — every event the user can manage, in any status.
const listManageableEvents = asyncHandler(async (req, res) => {
  const { status, club, q, page, limit } = req.validatedQuery;
  const user = req.user;
  const and = [];

  if (user.role === "uni_admin") {
    and.push({ $or: [{ university: user.university }, { university: null }] });
  } else if (!isPlatformAdmin(user)) {
    const clubIds = await activeClubIds(user);
    if (!clubIds.length) {
      return res.json({ success: true, count: 0, data: [], pagination: paginate(page, limit, 0) });
    }
    and.push({ club: { $in: clubIds } });
  }
  if (status) and.push({ status });
  if (club) and.push({ club });
  if (q) and.push({ title: new RegExp(escapeRegex(q), "i") });

  const filter = and.length ? { $and: and } : {};
  const [total, events] = await Promise.all([
    Event.countDocuments(filter),
    Event.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate("club", CLUB_FIELDS).lean(),
  ]);
  res.json({ success: true, count: events.length, data: events, pagination: paginate(page, limit, total) });
});

// POST /events — create a draft for a club the user organizes.
const createEvent = asyncHandler(async (req, res) => {
  const { _id, clubId, ...fields } = req.body;

  const club = await Club.findById(clubId).lean();
  if (!club) throw new AppError(404, "Club not found");
  const role = await clubRoleOf(req.user, club);
  if (!can(role, "manageEvents")) {
    throw new AppError(403, club.status === "approved"
      ? "Only this club's organizers can create its events"
      : "This club must be approved before it can create events");
  }

  assertValidSchedule(fields);
  const event = await Event.create({
    ...fields,
    _id: _id || newEventId(),
    club: club._id,
    university: club.university,
    organizerClub: club.name,
    seatsAvailable: fields.capacity,
    status: "draft",
    createdBy: req.user._id,
  });
  await audit(req.user, "event.create", "Event", event._id, { club: String(club._id) });
  res.status(201).json({ success: true, data: event });
});

// PUT /events/:id — edit an event's details (never its status or seats).
const updateEvent = asyncHandler(async (req, res) => {
  const { event } = await loadEventFor(req.user, req.params.id, "manageEvents");
  if (!EDITABLE_STATUSES.includes(event.status)) {
    throw new AppError(409, event.status === "pending_approval"
      ? "This event is awaiting approval. Withdraw it to make changes."
      : `A ${event.status} event can no longer be edited`);
  }

  const { capacity, ...fields } = req.body;
  assertValidSchedule({ ...event.toObject(), ...fields });

  const $set = {};
  const $unset = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null) $unset[key] = 1;
    else $set[key] = value;
  }
  // The status filter makes the update fail if the event changed state meanwhile.
  const filter = { _id: event._id, status: event.status };
  const update = {};

  if (capacity !== undefined && capacity !== event.capacity) {
    // Change seatsAvailable by the same amount as capacity. Atomic: it only
    // applies if no registration slipped in meanwhile, and refuses to shrink
    // capacity below the seats already taken.
    const delta = capacity - event.capacity;
    filter.capacity = event.capacity;
    filter.seatsAvailable = { $gte: -delta };
    $set.capacity = capacity;
    update.$inc = { seatsAvailable: delta };
  }
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;

  const updated = await Event.findOneAndUpdate(filter, update, { new: true, runValidators: true });
  if (!updated) {
    throw new AppError(409, capacity !== undefined
      ? "Capacity cannot be lower than the number of seats already booked"
      : "This event was changed by someone else. Refresh and try again.");
  }
  await audit(req.user, "event.update", "Event", event._id, { fields: Object.keys(req.body) });
  res.json({ success: true, data: updated });
});

// DELETE /events/:id — only drafts/rejected events without registrations.
// Anything else should be cancelled, which keeps the history.
const deleteEvent = asyncHandler(async (req, res) => {
  const { event } = await loadEventFor(req.user, req.params.id, "manageEvents");
  if (!["draft", "rejected"].includes(event.status)) {
    throw new AppError(409, "Only draft or rejected events can be deleted. Cancel this event instead.");
  }
  if (await Registration.exists({ eventId: event._id })) {
    throw new AppError(409, "This event has registrations and cannot be deleted");
  }
  const result = await Event.deleteOne({ _id: event._id, status: event.status });
  if (!result.deletedCount) throw new AppError(409, "This event was changed by someone else. Refresh and try again.");
  await audit(req.user, "event.delete", "Event", event._id, { title: event.title });
  res.json({ success: true, message: "Event deleted successfully" });
});

// POST /events/:id/:action — lifecycle transitions (submit, approve, ...).
const transitionEvent = asyncHandler(async (req, res) => {
  const { action } = req.params;
  const spec = TRANSITIONS[action];
  const reason = req.body.reason;

  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(404, "Event not found");
  const role = await eventRoleOf(req.user, event);
  if (!can(role, spec.ability)) {
    if (!role && !PUBLIC_STATUSES.includes(event.status)) throw new AppError(404, "Event not found");
    throw new AppError(403, "You do not have permission to do this");
  }
  if (!spec.from.includes(event.status)) {
    throw new AppError(409, `Cannot ${action} an event that is ${event.status.replace("_", " ")}`);
  }
  if (spec.needsReason && !reason) throw new AppError(400, "Please give a reason");
  assertTransitionAllowed(action, event);

  const now = new Date();
  const $set = { status: spec.to };
  const $unset = {};
  if (action === "submit") {
    $set.submittedAt = now;
    $unset.statusReason = 1;
  }
  if (action === "approve" || action === "reject") {
    $set.reviewedBy = req.user._id;
    $set.reviewedAt = now;
  }
  if (action === "approve") $unset.statusReason = 1;
  if (action === "reject" || action === "cancel") $set.statusReason = reason;
  if (action === "publish") $set.publishedAt = now;
  if (action === "cancel") $set.cancelledAt = now;

  const update = { $set };
  if (Object.keys($unset).length) update.$unset = $unset;
  const updated = await Event.findOneAndUpdate({ _id: event._id, status: event.status }, update, { new: true });
  if (!updated) throw new AppError(409, "This event was changed by someone else. Refresh and try again.");

  const meta = { from: event.status, to: spec.to };
  if (reason) meta.reason = reason;
  if (action === "cancel") {
    // Cancelling an event invalidates every ticket for it, and students who
    // registered themselves are told by email (when email is configured).
    const affectedUserIds = await Registration.distinct("userId", {
      eventId: event._id,
      status: "confirmed",
      userId: { $exists: true },
    });
    const users = await User.find({ _id: { $in: affectedUserIds }, status: "active" }).select("name email").lean();
    users.forEach((u) => sendEventCancelled(u, updated, reason));
    const result = await Registration.updateMany(
      { eventId: event._id, status: "confirmed" },
      { $set: { status: "cancelled", cancelReason: "event_cancelled", cancelledAt: now, cancelledBy: req.user._id } }
    );
    meta.ticketsCancelled = result.modifiedCount;
  }
  await audit(req.user, `event.${action}`, "Event", event._id, meta);
  res.json({ success: true, data: updated });
});

module.exports = {
  listEvents,
  getEvent,
  listManageableEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  transitionEvent,
};
