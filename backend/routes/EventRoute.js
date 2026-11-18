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
const { requireAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

// ==================== EVENT ROUTES ====================
// Reading events is public; changing them requires an admin.
// (Club organizers get scoped write access when clubs are introduced.)
router.get("/events", getAllEvents);
router.get("/events/:id", validate({ params: s.eventIdParam }), getEventById);
router.post("/events", requireAdmin, validate({ body: s.createEventSchema }), createEvent);
router.put("/events/:id", requireAdmin, validate({ params: s.eventIdParam, body: s.updateEventSchema }), updateEvent);
router.delete("/events/:id", requireAdmin, validate({ params: s.eventIdParam }), deleteEvent);

// ==================== REGISTRATION ROUTES ====================
// Registrations contain student data, so every route here is admin-only.
// Students will get their own "my tickets" endpoints in the ticketing phase.
router.use("/registrations", requireAdmin);
router.get("/registrations", getAllRegistrations);
router.get("/registrations/event/:eventId", validate({ params: s.eventIdForRegsParam }), getRegistrationsByEvent);
router.get("/registrations/:ticketId", validate({ params: s.ticketParam }), getRegistrationByTicket);
router.post("/registrations", validate({ body: s.createRegistrationSchema }), createRegistration);
router.put("/registrations/:ticketId", validate({ params: s.ticketParam, body: s.checkInSchema }), updateRegistration);
router.delete("/registrations/:ticketId", validate({ params: s.ticketParam }), deleteRegistration);

module.exports = router;
