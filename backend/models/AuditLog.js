const mongoose = require("mongoose");

// Records who did what to which record, for security reviews and disputes
// ("who approved this event?", "who removed this organizer?").
// Stores IDs and short labels only, never passwords or student details.
// Entries expire automatically after one year (data retention).
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true, maxlength: 60 },
  targetType: { type: String, required: true, maxlength: 40 },
  targetId: { type: String, required: true, maxlength: 60 },
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 365 },
});

auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
