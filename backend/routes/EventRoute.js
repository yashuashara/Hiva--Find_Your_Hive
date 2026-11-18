const express = require("express");
const router = express.Router();

const {
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
} = require("../controller/EventController");

// ==================== EVENT ROUTES ====================
router.get("/events", getAllEvents);
router.get("/events/:id", getEventById);
router.post("/events", createEvent);
router.put("/events/:id", updateEvent);
router.delete("/events/:id", deleteEvent);

// ==================== REGISTRATION ROUTES ====================
router.get("/registrations", getAllRegistrations);
router.get("/registrations/event/:eventId", getRegistrationsByEvent);
router.get("/registrations/:ticketId", getRegistrationByTicket);
router.post("/registrations", createRegistration);
router.put("/registrations/:ticketId", updateRegistration);
router.delete("/registrations/:ticketId", deleteRegistration);

module.exports = router;
