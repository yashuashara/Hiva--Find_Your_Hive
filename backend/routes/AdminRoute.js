const express = require("express");
const router = express.Router();

const admin = require("../controller/AdminController");
const { requireAdmin, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

router.use(requireAdmin);
router.get("/approvals", admin.listApprovals);
router.get("/users", validate({ query: s.listUsersQuery }), admin.listUsers);
// Granting or revoking platform roles is reserved for super admins.
router.patch("/users/:id/role", requireRole("super_admin"), validate({ params: s.userIdParam, body: s.setRoleSchema }), admin.setUserRole);
router.patch("/users/:id/status", validate({ params: s.userIdParam, body: s.setStatusSchema }), admin.setUserStatus);

module.exports = router;
