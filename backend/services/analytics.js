// Dashboard numbers, computed in the database (aggregation pipelines) rather
// than by shipping every registration to the browser.
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const ClubFollow = require("../models/ClubFollow");
const User = require("../models/User");
const config = require("../config/env");

const DAY = 24 * 60 * 60 * 1000;
const rate = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0); // one decimal %

// Registrations per day for the last `days` days (zero-filled), in the
// platform's time zone.
async function registrationTrend(eventIds, days = 30) {
  const since = new Date(Date.now() - (days - 1) * DAY);
  since.setHours(0, 0, 0, 0);
  const rows = await Registration.aggregate([
    { $match: { eventId: { $in: eventIds }, registrationDate: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$registrationDate", timezone: config.timeZone } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r.count]));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: config.timeZone }); // YYYY-MM-DD
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = fmt.format(new Date(Date.now() - i * DAY));
    out.push({ date: day, count: byDay.get(day) || 0 });
  }
  return out;
}

// Registered / checked-in / cancelled counts per event.
async function registrationCountsByEvent(eventIds) {
  const rows = await Registration.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $group: {
        _id: "$eventId",
        registered: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
        checkedIn: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "confirmed"] }, "$checkInStatus"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
}

const hasEnded = (e, now) => e.status === "completed" || (e.endsAt && e.endsAt < now);

// Shared shape for admin and club dashboards.
async function summarizeEvents(events) {
  const now = new Date();
  const ids = events.map((e) => e._id);
  const counts = await registrationCountsByEvent(ids);

  const statusCounts = {};
  let registered = 0;
  let checkedIn = 0;
  let cancelled = 0;
  let pastRegistered = 0;
  let pastCheckedIn = 0;
  let liveCapacity = 0;
  let liveRegistered = 0;
  const perEvent = [];

  for (const e of events) {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    const c = counts.get(e._id) || { registered: 0, checkedIn: 0, cancelled: 0 };
    registered += c.registered;
    checkedIn += c.checkedIn;
    cancelled += c.cancelled;
    if (["published", "completed"].includes(e.status)) {
      liveCapacity += e.capacity;
      liveRegistered += c.registered;
      if (hasEnded(e, now)) {
        pastRegistered += c.registered;
        pastCheckedIn += c.checkedIn;
      }
      perEvent.push({
        id: e._id,
        title: e.title,
        club: e.organizerClub,
        status: e.status,
        startsAt: e.startsAt,
        capacity: e.capacity,
        registered: c.registered,
        checkedIn: c.checkedIn,
        utilization: rate(c.registered, e.capacity),
        attendanceRate: hasEnded(e, now) || c.checkedIn ? rate(c.checkedIn, c.registered) : null,
      });
    }
  }

  perEvent.sort((a, b) => new Date(b.startsAt || 0) - new Date(a.startsAt || 0));
  const upcoming = events.filter((e) => e.status === "published" && (!e.endsAt || e.endsAt >= now)).length;

  return {
    totals: {
      events: events.length,
      upcoming,
      registrations: registered,
      cancelledRegistrations: cancelled,
      checkedIn,
      // Attendance is measured only over events that have already ended,
      // so upcoming events do not drag the percentage down.
      attendanceRate: rate(pastCheckedIn, pastRegistered),
      capacityUtilization: rate(liveRegistered, liveCapacity),
    },
    statusCounts,
    events: perEvent,
    trend: await registrationTrend(ids),
  };
}

// ---------- Platform / university admin ----------
async function adminOverview(user) {
  const scope = user.role === "super_admin" ? {} : { $or: [{ university: user.university }, { university: null }] };
  const events = await Event.find(scope)
    .select("title organizerClub status startsAt endsAt capacity category")
    .lean();
  const summary = await summarizeEvents(events);

  const clubScope = user.role === "super_admin" ? {} : { university: user.university };
  const [clubRows, users, pendingMemberships] = await Promise.all([
    Club.aggregate([{ $match: clubScope }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    User.countDocuments(user.role === "super_admin" ? {} : { university: user.university }),
    ClubMembership.countDocuments({ status: "pending", role: { $ne: "owner" } }),
  ]);
  const clubs = Object.fromEntries(clubRows.map((r) => [r._id, r.n]));

  const byCategory = {};
  for (const e of events) {
    if (["published", "completed"].includes(e.status)) byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  }

  return {
    ...summary,
    events: summary.events.slice(0, 10),
    topEvents: [...summary.events].sort((a, b) => b.registered - a.registered).slice(0, 5),
    byCategory,
    clubs,
    users,
    pending: {
      clubs: clubs.pending || 0,
      events: summary.statusCounts.pending_approval || 0,
      memberships: pendingMemberships,
    },
  };
}

// ---------- One club ----------
async function clubOverview(club) {
  const events = await Event.find({ club: club._id })
    .select("title organizerClub status startsAt endsAt capacity category")
    .lean();
  const summary = await summarizeEvents(events);
  const ids = events.map((e) => e._id);
  const titles = new Map(events.map((e) => [e._id, e.title]));

  const [recent, followers] = await Promise.all([
    Registration.find({ eventId: { $in: ids }, status: "confirmed" })
      .sort({ registrationDate: -1 })
      .limit(10)
      .select("studentName eventId registrationDate")
      .lean(),
    ClubFollow.countDocuments({ club: club._id }),
  ]);

  return {
    ...summary,
    followers,
    recentRegistrations: recent.map((r) => ({
      name: r.studentName,
      eventId: r.eventId,
      event: titles.get(r.eventId),
      at: r.registrationDate,
    })),
  };
}

module.exports = { adminOverview, clubOverview, registrationTrend };
