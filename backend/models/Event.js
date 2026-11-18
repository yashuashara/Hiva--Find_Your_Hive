const mongoose = require("mongoose");

const CATEGORIES = ["Technical", "Cultural", "Sports", "Workshop", "Seminar"];

// Lifecycle: draft → pending_approval → approved → published → completed
// plus rejected (back to editable) and cancelled (terminal).
const EVENT_STATUSES = ["draft", "pending_approval", "approved", "published", "completed", "rejected", "cancelled"];

const eventSchema = new mongoose.Schema({
  // String IDs (e.g. "EVT101") are kept for compatibility with existing data.
  _id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    trim: true,
    maxlength: 5000,
    default: ""
  },
  category: {
    type: String,
    required: true,
    enum: CATEGORIES
  },
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club"
  },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University"
  },
  // Club display name, copied from the club when the event is created.
  organizerClub: {
    type: String,
    required: true
  },
  bannerUrl: {
    type: String,
    trim: true,
    maxlength: 500
  },
  venue: {
    type: String,
    required: true
  },
  startsAt: Date,
  endsAt: Date,
  registrationOpensAt: Date,
  // Defaults to startsAt when not set.
  registrationClosesAt: Date,
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  // Managed by the server only: decremented atomically on registration.
  seatsAvailable: {
    type: Number,
    required: true,
    min: 0
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: {
    type: [String],
    default: []
  },
  coordinators: [
    {
      name: { type: String, required: true },
      contact: { type: String, required: true }
    }
  ],
  sponsors: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: EVENT_STATUSES,
    default: "draft"
  },
  // Reason given when an event is rejected or cancelled.
  statusReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  submittedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
  publishedAt: Date,
  cancelledAt: Date
}, { timestamps: true });

eventSchema.index({ status: 1, startsAt: 1 });
eventSchema.index({ club: 1, startsAt: -1 });
eventSchema.index({ university: 1, status: 1 });

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
module.exports.CATEGORIES = CATEGORIES;
module.exports.EVENT_STATUSES = EVENT_STATUSES;
