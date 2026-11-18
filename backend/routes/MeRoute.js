const express = require("express");
const router = express.Router();

const regs = require("../controller/RegistrationController");
const analytics = require("../controller/AnalyticsController");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

// Everything here is about the signed-in user's own data.
router.use(requireAuth);
router.get("/dashboard", analytics.getMyDashboard);
router.get("/recommendations", analytics.getRecommendations);
router.get("/registrations", validate({ query: s.myRegistrationsQuery }), regs.myRegistrations);
router.post("/registrations/:ticketId/cancel", validate({ params: s.ticketParam }), regs.cancelMyRegistration);

module.exports = router;
