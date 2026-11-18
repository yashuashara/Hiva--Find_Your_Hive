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

const Registration = mongoose.model("Registration", registrationSchema);

module.exports = Registration;
