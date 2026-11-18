const express = require("express");
const router = express.Router();

const events = require("../controller/EventController");
const regs = require("../controller/RegistrationController");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

// Fine-grained permissions (club roles, admin scope) are checked inside the
// controllers via services/permissions.js. Routes only require sign-in.

// ==================== EVENTS ====================
router.get("/events", validate({ query: s.listEventsQuery }), events.listEvents);
router.get("/manage/events", requireAuth, validate({ query: s.manageEventsQuery }), events.listManageableEvents);
router.post("/events", requireAuth, validate({ body: s.createEventSchema }), events.createEvent);
router.get("/events/:id", validate({ params: s.eventIdParam }), events.getEvent);
router.put("/events/:id", requireAuth, validate({ params: s.eventIdParam, body: s.updateEventSchema }), events.updateEvent);
router.delete("/events/:id", requireAuth, validate({ params: s.eventIdParam }), events.deleteEvent);

// Attendees (organizers of the event's club and admins)
router.get(
  "/events/:id/registrations/export",
  requireAuth,
  validate({ params: s.eventIdParam }),
  regs.exportEventRegistrations
);
router.get(
  "/events/:id/registrations",
  requireAuth,
  validate({ params: s.eventIdParam, query: s.listRegistrationsQuery }),
  regs.listEventRegistrations
);

// Students register themselves
router.post("/events/:id/register", requireAuth, validate({ params: s.eventIdParam, body: s.selfRegisterSchema }), regs.registerSelf);

// Lifecycle: submit | withdraw | approve | reject | publish | cancel | complete
router.post("/events/:id/:action", requireAuth, validate({ params: s.transitionParam, body: s.transitionBody }), events.transitionEvent);

// ==================== REGISTRATIONS ====================
router.get("/registrations", requireAdmin, regs.listAllRegistrations);
router.get(
  "/registrations/event/:eventId",
  requireAuth,
  validate({ params: s.eventIdForRegsParam, query: s.listRegistrationsQuery }),
  regs.listEventRegistrations
);
router.get("/registrations/:ticketId", requireAuth, validate({ params: s.ticketParam }), regs.getRegistrationByTicket);
router.post("/registrations", requireAuth, validate({ body: s.createRegistrationSchema }), regs.createWalkInRegistration);
router.put("/registrations/:ticketId", requireAuth, validate({ params: s.ticketParam, body: s.checkInSchema }), regs.updateCheckIn);
router.delete("/registrations/:ticketId", requireAuth, validate({ params: s.ticketParam }), regs.cancelRegistration);

module.exports = router;
