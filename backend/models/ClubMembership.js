const mongoose = require("mongoose");

// Links a user to a club with a club-level role:
//   owner     – manages the club profile and its team, plus everything below
//   organizer – creates and runs the club's events, sees attendee lists
//   volunteer – checks attendees in at the door
// Memberships added by a club owner start as "pending" until a university
// admin approves them, so organizer rights are never self-granted.
const CLUB_ROLES = ["owner", "organizer", "volunteer"];

const membershipSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: CLUB_ROLES, required: true },
    status: { type: String, enum: ["pending", "active"], default: "pending" },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
  },
  { timestamps: true }
);

membershipSchema.index({ club: 1, user: 1 }, { unique: true });
membershipSchema.index({ user: 1, status: 1 });
membershipSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model("ClubMembership", membershipSchema);
module.exports.CLUB_ROLES = CLUB_ROLES;
