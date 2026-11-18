const Club = require("../models/Club");
const ClubFollow = require("../models/ClubFollow");
const Registration = require("../models/Registration");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { clubRoleOf, can } = require("../services/permissions");
const { adminOverview, clubOverview } = require("../services/analytics");
const { recommendEvents } = require("../services/recommendations");

// GET /analytics/admin — university-wide dashboard (platform admins).
const getAdminOverview = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await adminOverview(req.user) });
});

// GET /analytics/clubs/:id — one club's dashboard (its owners/organizers and admins).
const getClubOverview = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id).lean();
  if (!club) throw new AppError(404, "Club not found");
  const role = await clubRoleOf(req.user, club);
  if (!can(role, "viewAttendees")) throw new AppError(club.status === "approved" ? 403 : 404, "You cannot view this club's dashboard");
  res.json({
    success: true,
    data: { club: { id: club._id, name: club.name, slug: club.slug }, ...(await clubOverview(club)) },
  });
});

// GET /me/dashboard — the student's own summary + recommendations.
const getMyDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const regs = await Registration.find({ userId: req.user._id })
    .populate("eventId", "status startsAt endsAt")
    .select("status checkInStatus eventId")
    .lean();

  let upcoming = 0;
  let attended = 0;
  let missed = 0;
  let cancelled = 0;
  for (const r of regs) {
    const ev = r.eventId;
    if (r.status === "cancelled") cancelled++;
    else if (r.checkInStatus) attended++;
    else if (ev && (ev.status === "completed" || (ev.endsAt && new Date(ev.endsAt) < now))) missed++;
    else if (ev && ev.status === "published") upcoming++;
  }

  const [follows, recommended] = await Promise.all([
    ClubFollow.find({ user: req.user._id }).populate("club", "name slug logoUrl category status").lean(),
    recommendEvents(req.user),
  ]);

  res.json({
    success: true,
    data: {
      counts: { upcoming, attended, missed, cancelled, total: regs.length },
      following: follows.filter((f) => f.club?.status === "approved").map((f) => f.club),
      recommended,
    },
  });
});

// GET /me/recommendations
const getRecommendations = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await recommendEvents(req.user) });
});

module.exports = { getAdminOverview, getClubOverview, getMyDashboard, getRecommendations };
