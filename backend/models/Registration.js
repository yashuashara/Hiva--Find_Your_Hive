const mongoose = require("mongoose");

// One registration = one ticket.
const registrationSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  eventId: {
    type: String,
    ref: "Event",
    required: true
  },
  // Set when a student registers themselves. Empty for walk-in registrations
  // entered by an organizer.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  // University ID / PRN.
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  // Cancelled registrations are kept (not deleted) for history, and their
  // tickets stop working.
  status: {
    type: String,
    enum: ["confirmed", "cancelled"],
    default: "confirmed"
  },
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  cancelReason: {
    type: String,
    enum: ["student", "organizer", "event_cancelled"]
  },
  checkInStatus: {
    type: Boolean,
    default: false
  },
  // Who checked the attendee in and when (set by the server, never the client).
  checkedInAt: Date,
  checkedInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ["UPI", "Card", "Cash", "Free"],
      required: true
    },
    amountPaid: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["Completed", "Pending", "Failed"],
      default: "Pending"
    }
  }
}, { timestamps: true });

// One ACTIVE registration per student per event, enforced by the database so
// it holds even under concurrent requests. Cancelled registrations do not
// count, so a student can register again after cancelling.
registrationSchema.index(
  { eventId: 1, studentId: 1 },
  { unique: true, name: "uniq_active_student_per_event", partialFilterExpression: { status: "confirmed" } }
);
registrationSchema.index(
  { eventId: 1, userId: 1 },
  {
    unique: true,
    name: "uniq_active_user_per_event",
    partialFilterExpression: { status: "confirmed", userId: { $exists: true } }
  }
);
registrationSchema.index({ userId: 1, registrationDate: -1 });
registrationSchema.index({ eventId: 1, status: 1 });

const Registration = mongoose.model("Registration", registrationSchema);

module.exports = Registration;
