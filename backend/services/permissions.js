// One place that answers "what may this user do with this club/event?".
// Controllers ask here instead of re-implementing role checks, so the rules
// stay consistent and are easy to audit.
const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");

const ADMIN_ROLES = ["uni_admin", "super_admin"];

// Which club-level roles may perform each action. "admin" means a platform
// admin responsible for the club's university.
const ABILITIES = {
  manageEvents: ["admin", "owner", "organizer"], // create/edit/submit/publish/cancel events
  viewAttendees: ["admin", "owner", "organizer"], // attendee lists, CSV export
  checkIn: ["admin", "owner", "organizer", "volunteer"],
  manageClub: ["admin", "owner"], // club profile and team
  review: ["admin"], // approve/reject clubs, events, memberships
};

const isPlatformAdmin = (user) => !!user && ADMIN_ROLES.includes(user.role);

// Super admins administer everything. University admins administer only their
// own university (records without a university are legacy data, visible to any
// university admin until migrated).
function isAdminOf(user, universityId) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (user.role !== "uni_admin") return false;
  if (!universityId) return true;
  return !!user.university && String(user.university) === String(universityId);
}

// Returns "admin" | "owner" | "organizer" | "volunteer" | null.
// Club roles only grant powers while the club is approved.
async function clubRoleOf(user, club) {
  if (!user || !club) return null;
  if (isAdminOf(user, club.university)) return "admin";
  if (club.status !== "approved") return null;
  const membership = await ClubMembership.findOne({ club: club._id, user: user._id, status: "active" })
    .select("role")
    .lean();
  return membership ? membership.role : null;
}

// Same as clubRoleOf, for an event (loads the event's club).
async function eventRoleOf(user, event) {
  if (!user || !event) return null;
  const clubId = event.club?._id || event.club; // works whether or not club is populated
  if (!clubId) return isAdminOf(user, event.university) ? "admin" : null;
  const club = await Club.findById(clubId).select("university status").lean();
  return clubRoleOf(user, club);
}

const can = (role, ability) => !!role && ABILITIES[ability].includes(role);

// Club IDs where the user holds an active role (for "my clubs' events" views).
async function activeClubIds(user, roles = ["owner", "organizer", "volunteer"]) {
  const memberships = await ClubMembership.find({ user: user._id, status: "active", role: { $in: roles } })
    .select("club")
    .lean();
  if (!memberships.length) return [];
  const approved = await Club.find({ _id: { $in: memberships.map((m) => m.club) }, status: "approved" })
    .select("_id")
    .lean();
  return approved.map((c) => c._id);
}

module.exports = { ADMIN_ROLES, ABILITIES, isPlatformAdmin, isAdminOf, clubRoleOf, eventRoleOf, can, activeClubIds };
