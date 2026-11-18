const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ["Technical", "Cultural", "Sports", "Workshop", "Seminar"]
  },
  organizerClub: {
    type: String,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  // Managed by the server only: decremented atomically on registration.
  seatsAvailable: {
    type: Number,
    required: true,
    min: 0
  },
  entryFee: {
    type: Number,
    default: 0
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
  }
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
