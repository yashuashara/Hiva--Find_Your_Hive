const express = require("express");
const router = express.Router();

const analytics = require("../controller/AnalyticsController");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

router.get("/admin", requireAdmin, analytics.getAdminOverview);
// Club access (owner/organizer/admin) is checked in the controller.
router.get("/clubs/:id", requireAuth, validate({ params: s.clubIdParam }), analytics.getClubOverview);

module.exports = router;
