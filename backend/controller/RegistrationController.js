const crypto = require("crypto");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { audit } = require("../services/audit");
const { eventRoleOf, can } = require("../services/permissions");
const { loadEventFor } = require("../services/eventAccess");
const { PUBLIC_STATUSES, registrationWindowError, reserveSeat, releaseSeat } = require("../services/eventRules");
const { parseTicketCode } = require("../services/ticketCode");
const { sendRegistrationConfirmation } = require("../services/email");

// 128 bits of randomness, URL-safe. Unguessable, unlike sequential IDs.
const newTicketId = () => `TKT-${crypto.randomBytes(16).toString("base64url")}`;

const DUPLICATE_MSG = "Already registered for this event";

// Creates a confirmed registration safely under concurrency:
//  1. Reserve a seat with a single atomic conditional update (never below 0).
//  2. Insert the registration; partial unique indexes reject a second ACTIVE
//     registration for the same student/user even if two requests race.
//  3. If the insert fails for any reason, release the reserved seat.
async function createConfirmedRegistration(event, data) {
  const dupFilter = { eventId: event._id, status: "confirmed", $or: [{ studentId: data.studentId }] };
  if (data.userId) dupFilter.$or.push({ userId: data.userId });
  if (await Registration.exists(dupFilter)) throw new AppError(409, DUPLICATE_MSG);

  const reserved = await reserveSeat(event._id);

  // Payment is never marked as completed based on client input. Free events
  // are complete by definition; paid ones stay Pending until verified.
  const paymentDetails = reserved.entryFee === 0
    ? { method: "Free", amountPaid: 0, status: "Completed" }
    : { method: data.paymentMethod || "Cash", amountPaid: 0, status: "Pending" };

  try {
    return await Registration.create({
      ticketId: newTicketId(),
      eventId: event._id,
      userId: data.userId,
      studentId: data.studentId,
      studentName: data.studentName,
      department: data.department,
      year: data.year,
      status: "confirmed",
      paymentDetails,
    });
  } catch (err) {
    await releaseSeat(event._id);
    if (err.code === 11000) throw new AppError(409, DUPLICATE_MSG);
    throw err;
  }
}

// Loads a registration plus the caller's role on its event. Callers without
// the ability get 404 so ticket IDs cannot be probed.
async function loadRegistrationFor(user, ticketId, ability) {
  const registration = await Registration.findOne({ ticketId });
  if (!registration) throw new AppError(404, "Ticket not found");
  const event = await Event.findById(registration.eventId).lean();
  const role = event ? await eventRoleOf(user, event) : null;
  if (!can(role, ability)) throw new AppError(404, "Ticket not found");
  return { registration, event, role };
}

// ==================== STUDENTS ====================

// POST /events/:id/register — a signed-in student registers themselves.
const registerSelf = asyncHandler(async (req, res) => {
  const user = req.user;
  const profile = user.profile || {};
  if (!profile.prn || !profile.department || !profile.year) {
    throw new AppError(400, "Complete your profile (PRN, department and year) before registering.", { code: "PROFILE_INCOMPLETE" });
  }

  const event = await Event.findById(req.params.id).lean();
  if (!event || !PUBLIC_STATUSES.includes(event.status)) throw new AppError(404, "Event not found");
  const windowError = registrationWindowError(event);
  if (windowError) throw new AppError(409, windowError);
  if (event.entryFee > 0) {
    // No payment gateway yet: never issue a "paid" ticket without real payment.
    throw new AppError(409, "Online registration for paid events is not available yet. Please contact the organizers.");
  }

  const registration = await createConfirmedRegistration(event, {
    userId: user._id,
    studentId: profile.prn,
    studentName: user.name,
    department: profile.department,
    year: profile.year,
  });
  sendRegistrationConfirmation(user, event, registration);
  res.status(201).json({ success: true, data: registration });
});

// GET /me/registrations — the signed-in user's own tickets.
const myRegistrations = asyncHandler(async (req, res) => {
  const { when } = req.validatedQuery;
  const now = new Date();
  const registrations = await Registration.find({ userId: req.user._id })
    .sort({ registrationDate: -1 })
    .populate("eventId", "title startsAt endsAt venue status organizerClub club bannerUrl category entryFee")
    .lean();

  const items = registrations.map(({ eventId: event, ...reg }) => ({ ...reg, eventId: event?._id, event }));
  const isUpcoming = (r) =>
    r.status === "confirmed" &&
    r.event?.status === "published" &&
    (!r.event.endsAt || new Date(r.event.endsAt) >= now);
  const data = when === "all" ? items : items.filter((r) => (when === "upcoming" ? isUpcoming(r) : !isUpcoming(r)));

  res.json({ success: true, count: data.length, data });
});

// POST /me/registrations/:ticketId/cancel — a student cancels their own
// registration before the event starts; the seat goes back to the pool.
const cancelMyRegistration = asyncHandler(async (req, res) => {
  const registration = await Registration.findOne({ ticketId: req.params.ticketId, userId: req.user._id });
  if (!registration) throw new AppError(404, "Ticket not found");
  if (registration.status === "cancelled") throw new AppError(409, "This registration is already cancelled");
  if (registration.checkInStatus) throw new AppError(409, "You have already checked in to this event");

  const event = await Event.findById(registration.eventId).lean();
  if (event?.startsAt && new Date() >= event.startsAt) {
    throw new AppError(409, "This event has already started, so the registration can no longer be cancelled");
  }

  const updated = await Registration.findOneAndUpdate(
    { _id: registration._id, status: "confirmed", checkInStatus: false },
    { $set: { status: "cancelled", cancelReason: "student", cancelledAt: new Date(), cancelledBy: req.user._id } },
    { new: true }
  );
  if (!updated) throw new AppError(409, "This registration changed. Refresh and try again.");
  await releaseSeat(registration.eventId);
  res.json({ success: true, data: updated });
});

// ==================== ORGANIZERS / ADMINS ====================

// GET /registrations — platform admins only: everything in their university.
const listAllRegistrations = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "uni_admin") {
    const eventIds = await Event.distinct("_id", { $or: [{ university: req.user.university }, { university: null }] });
    filter.eventId = { $in: eventIds };
  }
  const registrations = await Registration.find(filter).sort({ registrationDate: -1 }).lean();
  res.json({ success: true, count: registrations.length, data: registrations });
});

// GET /events/:id/registrations (and legacy /registrations/event/:eventId)
const listEventRegistrations = asyncHandler(async (req, res) => {
  const eventId = req.params.id || req.params.eventId;
  const { event } = await loadEventFor(req.user, eventId, "viewAttendees");
  const { status } = req.validatedQuery || { status: "confirmed" };
  const filter = { eventId: event._id };
  if (status !== "all") filter.status = status;
  const registrations = await Registration.find(filter).sort({ registrationDate: -1 }).lean();
  res.json({ success: true, count: registrations.length, data: registrations });
});

// Spreadsheet apps execute cells starting with = + - @ as formulas, so those
// are prefixed with a quote (CSV injection protection).
const csvCell = (value) => {
  let s = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

// GET /events/:id/registrations.csv — attendee export for organizers.
const exportEventRegistrations = asyncHandler(async (req, res) => {
  const { event } = await loadEventFor(req.user, req.params.id, "viewAttendees");
  const registrations = await Registration.find({ eventId: event._id }).sort({ registrationDate: 1 }).lean();

  const header = ["Ticket ID", "Student ID", "Name", "Department", "Year", "Status", "Checked in", "Checked in at", "Registered at", "Payment"];
  const rows = registrations.map((r) => [
    r.ticketId,
    r.studentId,
    r.studentName,
    r.department,
    r.year,
    r.status,
    r.checkInStatus ? "Yes" : "No",
    r.checkedInAt ? new Date(r.checkedInAt).toISOString() : "",
    r.registrationDate ? new Date(r.registrationDate).toISOString() : "",
    r.paymentDetails?.status,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  await audit(req.user, "event.export_attendees", "Event", event._id, { rows: rows.length });
  const filename = `${String(event._id).replace(/[^A-Za-z0-9-]/g, "")}-attendees.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send("﻿" + csv); // BOM so Excel reads UTF-8 names correctly
});

// GET /registrations/:ticketId — look up one ticket (organizers/volunteers).
const getRegistrationByTicket = asyncHandler(async (req, res) => {
  const { registration } = await loadRegistrationFor(req.user, req.params.ticketId, "checkIn");
  res.json({ success: true, data: registration });
});

// POST /registrations — walk-in registration entered by an organizer.
const createWalkInRegistration = asyncHandler(async (req, res) => {
  const { eventId, ...data } = req.body;
  const { event } = await loadEventFor(req.user, eventId, "manageEvents");
  if (event.status !== "published") throw new AppError(409, "Registrations can only be added to published events");

  const registration = await createConfirmedRegistration(event, data);
  await audit(req.user, "registration.walk_in", "Registration", registration.ticketId, { eventId: event._id });
  res.status(201).json({ success: true, data: registration });
});

// PUT /registrations/:ticketId — check in (or undo a mistaken check-in).
// Atomic: of several simultaneous scans of one ticket exactly one succeeds.
const updateCheckIn = asyncHandler(async (req, res) => {
  const { checkInStatus, eventId } = req.body;
  const { registration, event, role } = await loadRegistrationFor(req.user, req.params.ticketId, "checkIn");

  if (eventId && eventId !== registration.eventId) {
    throw new AppError(409, "This ticket is for a different event");
  }

  if (checkInStatus) {
    if (registration.status !== "confirmed") throw new AppError(409, "This ticket has been cancelled");
    if (event.status !== "published") throw new AppError(409, `Check-in is not possible: the event is ${event.status}`);
  } else if (!can(role, "manageEvents")) {
    throw new AppError(403, "Only organizers can undo a check-in");
  }

  const update = checkInStatus
    ? { $set: { checkInStatus: true, checkedInAt: new Date(), checkedInBy: req.user._id } }
    : { $set: { checkInStatus: false }, $unset: { checkedInAt: 1, checkedInBy: 1 } };
  const filter = { _id: registration._id, checkInStatus: !checkInStatus };
  if (checkInStatus) filter.status = "confirmed";

  const updated = await Registration.findOneAndUpdate(filter, update, { new: true });
  if (!updated) {
    const current = await Registration.findById(registration._id).lean();
    if (checkInStatus && current?.checkInStatus) {
      throw new AppError(409, "This ticket has already been checked in", { checkedInAt: current.checkedInAt });
    }
    throw new AppError(409, checkInStatus ? "This ticket cannot be checked in" : "This ticket is not checked in");
  }
  if (!checkInStatus) await audit(req.user, "registration.undo_check_in", "Registration", registration.ticketId);
  res.json({ success: true, data: updated });
});

// DELETE /registrations/:ticketId — organizer cancels a registration.
// The record is kept (status "cancelled") and the seat is released.
const cancelRegistration = asyncHandler(async (req, res) => {
  const { registration } = await loadRegistrationFor(req.user, req.params.ticketId, "manageEvents");
  if (registration.status === "cancelled") throw new AppError(409, "This registration is already cancelled");
  if (registration.checkInStatus) throw new AppError(409, "This attendee has already checked in");

  const updated = await Registration.findOneAndUpdate(
    { _id: registration._id, status: "confirmed", checkInStatus: false },
    { $set: { status: "cancelled", cancelReason: "organizer", cancelledAt: new Date(), cancelledBy: req.user._id } },
    { new: true }
  );
  if (!updated) throw new AppError(409, "This registration changed. Refresh and try again.");
  await releaseSeat(registration.eventId);
  await audit(req.user, "registration.cancel", "Registration", registration.ticketId, { eventId: registration.eventId });
  res.json({ success: true, message: "Registration cancelled", data: updated });
});

// ==================== DOOR SCANNING ====================

// Tickets stop working this long after the event ends.
const CHECK_IN_GRACE_MS = 6 * 60 * 60 * 1000;

const attendeeOf = (r) => ({ name: r.studentName, studentId: r.studentId, department: r.department, year: r.year });

async function attendanceStats(eventId) {
  const [registered, checkedIn] = await Promise.all([
    Registration.countDocuments({ eventId, status: "confirmed" }),
    Registration.countDocuments({ eventId, status: "confirmed", checkInStatus: true }),
  ]);
  return { registered, checkedIn };
}

// POST /events/:id/check-in { code } — called by the scanner at THIS event's
// entrance. `code` is the raw QR text (or a typed ticket ID). The QR content
// is never trusted: everything is looked up and verified here, and the
// check-in itself is a single atomic update, so a ticket works exactly once.
// Every failure carries a machine-readable code for the scanner UI.
const checkInByCode = asyncHandler(async (req, res) => {
  const { event } = await loadEventFor(req.user, req.params.id, "checkIn");
  const fail = (status, code, message, extra = {}) => {
    throw new AppError(status, message, { code, ...extra });
  };

  const ticketId = parseTicketCode(req.body.code);
  if (!ticketId) fail(400, "INVALID_CODE", "This is not a Hiva ticket");

  if (event.status === "cancelled") fail(409, "EVENT_CANCELLED", "This event has been cancelled");
  if (event.status !== "published") fail(409, "EVENT_NOT_ACTIVE", `Check-in is closed: the event is ${event.status}`);
  if (event.endsAt && Date.now() > new Date(event.endsAt).getTime() + CHECK_IN_GRACE_MS) {
    fail(409, "EXPIRED", "This event has ended; tickets have expired");
  }

  const registration = await Registration.findOne({ ticketId }).lean();
  if (!registration) fail(404, "NOT_FOUND", "Ticket not recognised");
  if (registration.eventId !== event._id) fail(409, "WRONG_EVENT", "This ticket is for a different event");
  if (registration.status !== "confirmed") {
    fail(409, "CANCELLED", "This ticket has been cancelled", { attendee: attendeeOf(registration) });
  }

  const now = new Date();
  const updated = await Registration.findOneAndUpdate(
    { _id: registration._id, status: "confirmed", checkInStatus: false },
    { $set: { checkInStatus: true, checkedInAt: now, checkedInBy: req.user._id } },
    { new: true }
  ).lean();

  if (!updated) {
    const current = await Registration.findById(registration._id).lean();
    if (current?.checkInStatus) {
      fail(409, "ALREADY_CHECKED_IN", "Already checked in", {
        attendee: attendeeOf(current),
        checkedInAt: current.checkedInAt,
      });
    }
    fail(409, "CANCELLED", "This ticket has been cancelled", { attendee: attendeeOf(registration) });
  }

  res.json({
    success: true,
    data: {
      code: "OK",
      attendee: attendeeOf(updated),
      checkedInAt: updated.checkedInAt,
      stats: await attendanceStats(event._id),
    },
  });
});

// GET /events/:id/attendance — live counts + latest check-ins, polled by the
// scanner and the event page so every door sees the same numbers.
const getAttendance = asyncHandler(async (req, res) => {
  const { event } = await loadEventFor(req.user, req.params.id, "checkIn");
  const [stats, recent] = await Promise.all([
    attendanceStats(event._id),
    Registration.find({ eventId: event._id, status: "confirmed", checkInStatus: true })
      .sort({ checkedInAt: -1 })
      .limit(10)
      .select("studentName checkedInAt")
      .lean(),
  ]);
  res.json({
    success: true,
    data: {
      ...stats,
      capacity: event.capacity,
      recent: recent.map((r) => ({ name: r.studentName, checkedInAt: r.checkedInAt })),
    },
  });
});

module.exports = {
  checkInByCode,
  getAttendance,
  registerSelf,
  myRegistrations,
  cancelMyRegistration,
  listAllRegistrations,
  listEventRegistrations,
  exportEventRegistrations,
  getRegistrationByTicket,
  createWalkInRegistration,
  updateCheckIn,
  cancelRegistration,
};
