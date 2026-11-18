const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { audit } = require("../services/audit");
const { getDefaultUniversity } = require("../services/university");
const { clubRoleOf, isAdminOf, isPlatformAdmin, can } = require("../services/permissions");

const MAX_PENDING_REQUESTS = 3;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PUBLIC_FIELDS = "name slug description category logoUrl socials contactEmail status university createdAt";

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "club";

async function uniqueSlug(universityId, name) {
  const base = slugify(name);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await Club.exists({ university: universityId, slug }))) return slug;
  }
  throw new AppError(409, "Could not create a unique link for this club name");
}

// Loads a club by id and checks the user's ability on it. Clubs that are not
// public and not manageable by the user answer 404.
async function loadClubFor(user, clubId, ability) {
  const club = await Club.findById(clubId);
  if (!club) throw new AppError(404, "Club not found");
  const role = await clubRoleOf(user, club);
  if (can(role, ability)) return { club, role };
  if (club.status !== "approved") throw new AppError(404, "Club not found");
  throw new AppError(403, "You do not have permission to do this");
}

// GET /clubs — public directory of approved clubs.
// Admins may pass ?status= to see pending/rejected/suspended clubs.
const listClubs = asyncHandler(async (req, res) => {
  const { q, category, status, page, limit } = req.validatedQuery;
  const filter = { status: "approved" };
  if (status && isPlatformAdmin(req.user)) {
    filter.status = status;
    if (req.user.role === "uni_admin") filter.university = req.user.university;
  }
  if (q) filter.name = new RegExp(escapeRegex(q), "i");
  if (category) filter.category = category;

  const [total, clubs] = await Promise.all([
    Club.countDocuments(filter),
    Club.find(filter).select(PUBLIC_FIELDS).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.json({
    success: true,
    count: clubs.length,
    data: clubs,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// GET /clubs/mine — clubs the signed-in user belongs to (any status).
const myClubs = asyncHandler(async (req, res) => {
  const memberships = await ClubMembership.find({ user: req.user._id })
    .populate("club", "name slug status category logoUrl")
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    success: true,
    data: memberships
      .filter((m) => m.club)
      .map((m) => ({ membershipId: m._id, role: m.role, status: m.status, club: m.club })),
  });
});

// GET /clubs/:slug — public page for approved clubs. Pending clubs are only
// visible to their requester/team and admins.
const getClub = asyncHandler(async (req, res) => {
  const club = await Club.findOne({ slug: req.params.slug }).select(PUBLIC_FIELDS + " statusReason").lean();
  if (!club) throw new AppError(404, "Club not found");

  const role = await clubRoleOf(req.user, club);
  const membership = req.user
    ? await ClubMembership.findOne({ club: club._id, user: req.user._id }).select("role status").lean()
    : null;
  if (club.status !== "approved" && !role && !membership) throw new AppError(404, "Club not found");
  if (!role && !membership) delete club.statusReason;

  // Public team list: names and club roles only (no emails).
  const team = await ClubMembership.find({ club: club._id, status: "active", role: { $in: ["owner", "organizer"] } })
    .populate("user", "name")
    .lean();

  res.json({
    success: true,
    data: { ...club, team: team.filter((m) => m.user).map((m) => ({ name: m.user.name, role: m.role })) },
    viewer: {
      role,
      membership,
      canManageClub: can(role, "manageClub"),
      canManageEvents: can(role, "manageEvents"),
      canReview: can(role, "review"),
    },
  });
});

// POST /clubs — any signed-in user can REQUEST a club. It stays pending (and
// the requester gets no powers) until a university admin approves it.
const createClub = asyncHandler(async (req, res) => {
  const user = req.user;
  const university = user.university ? { _id: user.university } : await getDefaultUniversity();
  const adminCreated = isAdminOf(user, university._id);

  if (!adminCreated) {
    const pending = await Club.countDocuments({ requestedBy: user._id, status: "pending" });
    if (pending >= MAX_PENDING_REQUESTS) {
      throw new AppError(429, `You already have ${MAX_PENDING_REQUESTS} club requests waiting for review`);
    }
  }
  const nameTaken = await Club.exists({
    university: university._id,
    name: new RegExp(`^${escapeRegex(req.body.name)}$`, "i"),
    status: { $ne: "rejected" },
  });
  if (nameTaken) throw new AppError(409, "A club with this name already exists");

  const club = await Club.create({
    ...req.body,
    university: university._id,
    slug: await uniqueSlug(university._id, req.body.name),
    status: adminCreated ? "approved" : "pending",
    requestedBy: user._id,
    ...(adminCreated ? { reviewedBy: user._id, reviewedAt: new Date() } : {}),
  });
  if (!adminCreated) {
    // The requester becomes the owner once the club is approved.
    await ClubMembership.create({ club: club._id, user: user._id, role: "owner", status: "pending", addedBy: user._id });
  }
  await audit(user, adminCreated ? "club.create" : "club.request", "Club", club._id, { name: club.name });
  res.status(201).json({ success: true, data: club });
});

// PATCH /clubs/:id — club owners edit their profile; only admins rename.
const updateClub = asyncHandler(async (req, res) => {
  const { club, role } = await loadClubFor(req.user, req.params.id, "manageClub");
  const { socials, ...fields } = req.body;
  if (fields.name !== undefined && role !== "admin") {
    throw new AppError(403, "Contact a university admin to rename the club");
  }

  const $set = { ...fields };
  for (const [key, value] of Object.entries(socials || {})) $set[`socials.${key}`] = value;
  const updated = await Club.findByIdAndUpdate(club._id, { $set }, { new: true, runValidators: true });
  await audit(req.user, "club.update", "Club", club._id, { fields: Object.keys(req.body) });
  res.json({ success: true, data: updated });
});

// POST /clubs/:id/:action — admin review (approve/reject/suspend/reinstate).
const CLUB_REVIEW = {
  approve: { from: ["pending", "rejected"], to: "approved" },
  reject: { from: ["pending"], to: "rejected", needsReason: true },
  suspend: { from: ["approved"], to: "suspended", needsReason: true },
  reinstate: { from: ["suspended"], to: "approved" },
};

const reviewClub = asyncHandler(async (req, res) => {
  const { action } = req.params;
  const spec = CLUB_REVIEW[action];
  const club = await Club.findById(req.params.id);
  if (!club) throw new AppError(404, "Club not found");
  if (!isAdminOf(req.user, club.university)) throw new AppError(403, "Only university admins can review clubs");
  if (!spec.from.includes(club.status)) throw new AppError(409, `Cannot ${action} a club that is ${club.status}`);
  if (spec.needsReason && !req.body.reason) throw new AppError(400, "Please give a reason");

  const $set = { status: spec.to, reviewedBy: req.user._id, reviewedAt: new Date() };
  const update = { $set };
  if (req.body.reason) $set.statusReason = req.body.reason;
  else update.$unset = { statusReason: 1 };

  const updated = await Club.findOneAndUpdate({ _id: club._id, status: club.status }, update, { new: true });
  if (!updated) throw new AppError(409, "This club was changed by someone else. Refresh and try again.");

  if (action === "approve") {
    // Approving the club confirms the requester as its owner.
    await ClubMembership.updateMany(
      { club: club._id, role: "owner", status: "pending" },
      { $set: { status: "active", approvedBy: req.user._id, approvedAt: new Date() } }
    );
  }
  await audit(req.user, `club.${action}`, "Club", club._id, { from: club.status, to: spec.to, reason: req.body.reason });
  res.json({ success: true, data: updated });
});

// GET /clubs/:id/members — the club team (owners, organizers, admins).
const listMembers = asyncHandler(async (req, res) => {
  const { club } = await loadClubFor(req.user, req.params.id, "manageEvents");
  const members = await ClubMembership.find({ club: club._id })
    .populate("user", "name email")
    .sort({ status: 1, role: 1, createdAt: 1 })
    .lean();
  res.json({
    success: true,
    data: members.filter((m) => m.user).map((m) => ({
      id: m._id,
      role: m.role,
      status: m.status,
      user: { id: m.user._id, name: m.user.name, email: m.user.email },
      createdAt: m.createdAt,
    })),
  });
});

// POST /clubs/:id/members — add a team member by email.
// Added by an owner → pending until a university admin approves.
// Added by an admin → active immediately.
const addMember = asyncHandler(async (req, res) => {
  const { club, role } = await loadClubFor(req.user, req.params.id, "manageClub");
  const { email, role: memberRole } = req.body;
  if (memberRole === "owner" && role !== "admin") throw new AppError(403, "Only university admins can add club owners");

  const target = await User.findOne({ email }).select("_id name email status");
  if (!target || target.status !== "active") {
    throw new AppError(404, "No active account uses that email. Ask them to sign up first.");
  }
  if (await ClubMembership.exists({ club: club._id, user: target._id })) {
    throw new AppError(409, "This person is already on the club team");
  }

  const status = role === "admin" ? "active" : "pending";
  const membership = await ClubMembership.create({
    club: club._id,
    user: target._id,
    role: memberRole,
    status,
    addedBy: req.user._id,
    ...(status === "active" ? { approvedBy: req.user._id, approvedAt: new Date() } : {}),
  });
  await audit(req.user, "club.member_add", "Club", club._id, { user: String(target._id), role: memberRole, status });
  res.status(201).json({
    success: true,
    message: status === "pending" ? "Added. A university admin needs to approve this before it takes effect." : "Added",
    data: membership,
  });
});

// POST /clubs/:id/members/:memberId/approve — admins confirm organizer rights.
const approveMember = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id).lean();
  if (!club) throw new AppError(404, "Club not found");
  if (!isAdminOf(req.user, club.university)) throw new AppError(403, "Only university admins can approve team members");

  const membership = await ClubMembership.findOneAndUpdate(
    { _id: req.params.memberId, club: club._id, status: "pending" },
    { $set: { status: "active", approvedBy: req.user._id, approvedAt: new Date() } },
    { new: true }
  );
  if (!membership) throw new AppError(404, "No pending membership found");
  await audit(req.user, "club.member_approve", "Club", club._id, { user: String(membership.user), role: membership.role });
  res.json({ success: true, data: membership });
});

// DELETE /clubs/:id/members/:memberId — remove a member (or leave the club).
const removeMember = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id).lean();
  if (!club) throw new AppError(404, "Club not found");
  const membership = await ClubMembership.findOne({ _id: req.params.memberId, club: club._id });
  if (!membership) throw new AppError(404, "Member not found");

  const role = await clubRoleOf(req.user, club);
  const isSelf = String(membership.user) === String(req.user._id);
  const allowed = role === "admin" || isSelf || (role === "owner" && membership.role !== "owner");
  if (!allowed) throw new AppError(403, "You do not have permission to remove this member");

  if (membership.role === "owner" && membership.status === "active") {
    const owners = await ClubMembership.countDocuments({ club: club._id, role: "owner", status: "active" });
    if (owners <= 1 && role !== "admin") throw new AppError(409, "A club needs at least one owner. Add another owner first.");
  }
  await membership.deleteOne();
  await audit(req.user, "club.member_remove", "Club", club._id, { user: String(membership.user), role: membership.role });
  res.json({ success: true, message: "Member removed" });
});

module.exports = {
  listClubs,
  myClubs,
  getClub,
  createClub,
  updateClub,
  reviewClub,
  listMembers,
  addMember,
  approveMember,
  removeMember,
};
