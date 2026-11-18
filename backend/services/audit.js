const AuditLog = require("../models/AuditLog");
const config = require("../config/env");

// Writes an audit entry. Never throws: a logging failure must not break the
// action the user performed, but it is reported in the server log.
async function audit(actor, action, targetType, targetId, meta) {
  try {
    await AuditLog.create({
      actor: actor?._id || actor,
      action,
      targetType,
      targetId: String(targetId),
      meta,
    });
  } catch (err) {
    if (!config.isTest) console.error("[audit] failed to record", action, err.message);
  }
}

module.exports = { audit };
