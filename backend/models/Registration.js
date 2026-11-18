const mongoose = require("mongoose");

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
    max: 4
  },
  registrationDate: {
    type: Date,
    default: Date.now
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

// A student can hold only one registration per event. Enforced by the
// database, so it holds even under concurrent requests.
registrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

const Registration = mongoose.model("Registration", registrationSchema);

module.exports = Registration;
