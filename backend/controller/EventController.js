const Event = require("../models/Event");
const Registration = require("../models/Registration");

// ==================== EVENT CONTROLLERS ====================

// GET all events
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST create new event
const createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT update event
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE event
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REGISTRATION CONTROLLERS ====================

// GET all registrations
const getAllRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find();
    res.status(200).json({ success: true, count: registrations.length, data: registrations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET registrations by event ID
const getRegistrationsByEvent = async (req, res) => {
  try {
    const registrations = await Registration.find({ eventId: req.params.eventId });
    res.status(200).json({ success: true, count: registrations.length, data: registrations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single registration by ticket ID
const getRegistrationByTicket = async (req, res) => {
  try {
    const registration = await Registration.findOne({ ticketId: req.params.ticketId });
    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }
    res.status(200).json({ success: true, data: registration });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST create new registration
const createRegistration = async (req, res) => {
  try {
    // Check if event exists and has available seats
    const event = await Event.findById(req.body.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (event.seatsAvailable <= 0) {
      return res.status(400).json({ success: false, message: "No seats available" });
    }

    const registration = await Registration.create(req.body);

    // Decrease available seats
    await Event.findByIdAndUpdate(req.body.eventId, { $inc: { seatsAvailable: -1 } });

    res.status(201).json({ success: true, data: registration });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT update registration (e.g., check-in)
const updateRegistration = async (req, res) => {
  try {
    const registration = await Registration.findOneAndUpdate(
      { ticketId: req.params.ticketId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }
    res.status(200).json({ success: true, data: registration });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE registration
const deleteRegistration = async (req, res) => {
  try {
    const registration = await Registration.findOneAndDelete({ ticketId: req.params.ticketId });
    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    // Increase available seats back
    await Event.findByIdAndUpdate(registration.eventId, { $inc: { seatsAvailable: 1 } });

    res.status(200).json({ success: true, message: "Registration deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
  deleteRegistration
};
