const Event = require("../models/Event");
const AppError = require("../utils/AppError");
const { eventRoleOf, can } = require("./permissions");
const { PUBLIC_STATUSES } = require("./eventRules");

// Loads an event and checks the user may perform `ability` on it.
// Unpublished events the user cannot manage answer 404, so their existence
// is not revealed.
async function loadEventFor(user, eventId, ability) {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError(404, "Event not found");

  const role = await eventRoleOf(user, event);
  if (can(role, ability)) return { event, role };

  if (!PUBLIC_STATUSES.includes(event.status)) throw new AppError(404, "Event not found");
  if (!user) throw new AppError(401, "Please sign in to continue");
  throw new AppError(403, "You do not have permission to do this");
}

module.exports = { loadEventFor };
