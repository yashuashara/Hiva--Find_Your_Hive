const express = require("express");
const router = express.Router();

const regs = require("../controller/RegistrationController");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

// Everything here is about the signed-in user's own data.
router.use(requireAuth);
router.get("/registrations", validate({ query: s.myRegistrationsQuery }), regs.myRegistrations);
router.post("/registrations/:ticketId/cancel", validate({ params: s.ticketParam }), regs.cancelMyRegistration);

module.exports = router;
