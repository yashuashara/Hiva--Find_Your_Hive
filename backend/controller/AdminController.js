const User = require("../models/User");
const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const Event = require("../models/Event");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { audit } = require("../services/audit");
const { getDefaultUniversity } = require("../services/university");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// University admins only see their own university; super admins see all.
const universityScope = (user, field = "university") =>
  user.role === "super_admin" ? {} : { $or: [{ [field]: user.university }, { [field]: null }] };

// GET /admin/approvals — everything waiting for an admin decision.
const listApprovals = asyncHandler(async (req, res) => {
  const scope = universityScope(req.user);
  const [clubs, events, pendingMemberships] = await Promise.all([
    Club.find({ ...scope, status: "pending" }).populate("requestedBy", "name email").sort({ createdAt: 1 }).lean(),
    Event.find({ ...scope, status: "pending_approval" }).populate("club", "name slug").sort({ submittedAt: 1 }).lean(),
    ClubMembership.find({ status: "pending", role: { $ne: "owner" } })
      .populate("user", "name email")
      .populate({ path: "club", select: "name slug status university" })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  // Memberships of clubs in other universities are filtered out here because
  // the scope lives on the club, not the membership.
  const memberships = pendingMemberships.filter(
    (m) =>
      m.club &&
      m.user &&
      m.club.status === "approved" &&
      (req.user.role === "super_admin" || !m.club.university || String(m.club.university) === String(req.user.university))
  );

  res.json({ success: true, data: { clubs, events, memberships } });
});

// GET /admin/users — search accounts (for assigning roles / moderation).
const listUsers = asyncHandler(async (req, res) => {
  const { q, role, page, limit } = req.validatedQuery;
  const filter = { ...universityScope(req.user) };
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$and = [{ $or: [{ name: rx }, { email: rx }] }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
  ]);
  res.json({
    success: true,
    count: users.length,
    data: users,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// PATCH /admin/users/:id/role — super admins only. Nobody can change their own
// role, so an admin can never lock out or escalate themselves by mistake.
const setUserRole = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new AppError(400, "You cannot change your own role");
  const target = await User.findById(req.params.id);
  if (!target) throw new AppError(404, "User not found");

  const from = target.role;
  target.role = req.body.role;
  if (target.role === "uni_admin" && !target.university) target.university = (await getDefaultUniversity())._id;
  await target.save();
  await audit(req.user, "user.role_change", "User", target._id, { from, to: target.role });
  res.json({ success: true, data: target });
});

// PATCH /admin/users/:id/status — suspend or reactivate an account.
// Suspended users are signed out on their next request.
const setUserStatus = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new AppError(400, "You cannot change your own status");
  const target = await User.findById(req.params.id);
  if (!target) throw new AppError(404, "User not found");
  if (req.user.role !== "super_admin") {
    if (target.role !== "student") throw new AppError(403, "Only super admins can suspend administrators");
    if (target.university && String(target.university) !== String(req.user.university)) {
      throw new AppError(404, "User not found");
    }
  }

  const from = target.status;
  target.status = req.body.status;
  await target.save();
  await audit(req.user, "user.status_change", "User", target._id, { from, to: target.status });
  res.json({ success: true, data: target });
});

module.exports = { listApprovals, listUsers, setUserRole, setUserStatus };
