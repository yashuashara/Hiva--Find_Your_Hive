const crypto = require("crypto");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

// 128 bits of randomness, URL-safe. Unguessable, unlike sequential IDs.
const newTicketId = () => `TKT-${crypto.randomBytes(16).toString("base64url")}`;
const newEventId = () => `EVT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

// ==================== EVENT CONTROLLERS ====================

// GET all events (public)
const getAllEvents = asyncHandler(async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: events.length, data: events });
});

// GET single event by ID (public)
const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(404, "Event not found");
  res.status(200).json({ success: true, data: event });
});

// POST create new event (admin)
// seatsAvailable is always derived from capacity on the server.
const createEvent = asyncHandler(async (req, res) => {
  const { _id, ...fields } = req.body;
  const event = await Event.create({
    ...fields,
    _id: _id || newEventId(),
    seatsAvailable: fields.capacity,
  });
  res.status(201).json({ success: true, data: event });
});

// PUT update event (admin)
const updateEvent = asyncHandler(async (req, res) => {
  const { capacity, ...fields } = req.body;
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(404, "Event not found");

  const update = { $set: fields };
  const filter = { _id: event._id };

  if (capacity !== undefined && capacity !== event.capacity) {
    // Change seatsAvailable by the same amount as capacity. The filter makes
    // this atomic: it only applies if no registration slipped in meanwhile,
    // and it refuses to shrink capacity below the seats already taken.
    const delta = capacity - event.capacity;
    filter.capacity = event.capacity;
    filter.seatsAvailable = { $gte: -delta };
    update.$set = { ...fields, capacity };
    update.$inc = { seatsAvailable: delta };
  }

  const updated = await Event.findOneAndUpdate(filter, update, { new: true, runValidators: true });
  if (!updated) {
    throw new AppError(409, "Capacity cannot be lower than the number of seats already booked");
  }
  res.status(200).json({ success: true, data: updated });
});

// DELETE event (admin)
// Refuses to delete events that have registrations, so ticket holders are
// never left with orphaned tickets. (Cancelling events comes with the
// event lifecycle in a later phase.)
const deleteEvent = asyncHandler(async (req, res) => {
  const hasRegistrations = await Registration.exists({ eventId: req.params.id });
  if (hasRegistrations) {
    throw new AppError(409, "This event has registrations and cannot be deleted");
  }
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) throw new AppError(404, "Event not found");
  res.status(200).json({ success: true, message: "Event deleted successfully" });
});

// ==================== REGISTRATION CONTROLLERS (admin only) ====================

const getAllRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find().sort({ registrationDate: -1 });
  res.status(200).json({ success: true, count: registrations.length, data: registrations });
});

const getRegistrationsByEvent = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({ eventId: req.params.eventId }).sort({ registrationDate: -1 });
  res.status(200).json({ success: true, count: registrations.length, data: registrations });
});

const getRegistrationByTicket = asyncHandler(async (req, res) => {
  const registration = await Registration.findOne({ ticketId: req.params.ticketId });
  if (!registration) throw new AppError(404, "Registration not found");
  res.status(200).json({ success: true, data: registration });
});

// POST create new registration
// Concurrency-safe without needing a replica set:
//  1. Reserve a seat with a single atomic conditional update (never below 0).
//  2. Insert the registration; the unique (eventId, studentId) index rejects
//     duplicates even if two requests race.
//  3. If the insert fails for any reason, release the reserved seat.
const createRegistration = asyncHandler(async (req, res) => {
  const { eventId, studentId, studentName, department, year, paymentMethod } = req.body;

  const event = await Event.findById(eventId).select("entryFee");
  if (!event) throw new AppError(404, "Event not found");

  if (await Registration.exists({ eventId, studentId })) {
    throw new AppError(409, "This student is already registered for this event");
  }

  const reserved = await Event.findOneAndUpdate(
    { _id: eventId, seatsAvailable: { $gt: 0 } },
    { $inc: { seatsAvailable: -1 } },
    { new: true }
  );
  if (!reserved) throw new AppError(409, "This event is full");

  // Payment is never marked as completed based on client input. Free events
  // are complete by definition; paid ones stay Pending until verified.
  const isFree = reserved.entryFee === 0;
  const paymentDetails = isFree
    ? { method: "Free", amountPaid: 0, status: "Completed" }
    : { method: paymentMethod || "Cash", amountPaid: 0, status: "Pending" };

  try {
    const registration = await Registration.create({
      ticketId: newTicketId(),
      eventId,
      studentId,
      studentName,
      department,
      year,
      paymentDetails,
    });
    res.status(201).json({ success: true, data: registration });
  } catch (err) {
    await Event.updateOne({ _id: eventId }, { $inc: { seatsAvailable: 1 } });
    if (err.code === 11000) {
      throw new AppError(409, "This student is already registered for this event");
    }
    throw err;
  }
});

// PUT /registrations/:ticketId — check in (or undo a mistaken check-in).
// Only checkInStatus is accepted. Check-in is atomic: of two simultaneous
// scans of the same ticket, exactly one succeeds and the other gets 409.
const updateRegistration = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { checkInStatus } = req.body;

  const update = checkInStatus
    ? { $set: { checkInStatus: true, checkedInAt: new Date(), checkedInBy: req.user._id } }
    : { $set: { checkInStatus: false }, $unset: { checkedInAt: 1, checkedInBy: 1 } };

  const registration = await Registration.findOneAndUpdate(
    { ticketId, checkInStatus: !checkInStatus },
    update,
    { new: true }
  );

  if (!registration) {
    const exists = await Registration.exists({ ticketId });
    if (!exists) throw new AppError(404, "Registration not found");
    throw new AppError(409, checkInStatus ? "This ticket has already been checked in" : "This ticket is not checked in");
  }
  res.status(200).json({ success: true, data: registration });
});

// DELETE registration — frees the seat again.
const deleteRegistration = asyncHandler(async (req, res) => {
  const registration = await Registration.findOneAndDelete({ ticketId: req.params.ticketId });
  if (!registration) throw new AppError(404, "Registration not found");

  // Never raise seatsAvailable above capacity (guards against drifted data).
  await Event.updateOne(
    { _id: registration.eventId, $expr: { $lt: ["$seatsAvailable", "$capacity"] } },
    { $inc: { seatsAvailable: 1 } }
  );
  res.status(200).json({ success: true, message: "Registration deleted successfully" });
});

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllRegistrations,
  getRegistrationsByEvent,
  getRegistrationByTicket,
  createRegistration,
  updateRegistration,
  deleteRegistration,
};
