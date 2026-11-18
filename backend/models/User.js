const mongoose = require("mongoose");

// Platform-level roles. Club-level roles (owner/organizer/volunteer) will live
// in a separate ClubMembership collection so one user can organise for one
// club without becoming an admin of the whole platform.
const ROLES = ["student", "uni_admin", "super_admin"];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Never returned by queries unless explicitly requested with +passwordHash.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "student" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
