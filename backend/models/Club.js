const mongoose = require("mongoose");

const CLUB_CATEGORIES = ["Technical", "Cultural", "Sports", "Entrepreneurship", "Arts", "Social", "Academic", "Other"];
const CLUB_STATUSES = ["pending", "approved", "rejected", "suspended"];

const clubSchema = new mongoose.Schema(
  {
    university: { type: mongoose.Schema.Types.ObjectId, ref: "University", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Stable, URL-friendly identifier (unique within a university).
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    category: { type: String, enum: CLUB_CATEGORIES, default: "Other" },
    // Shown instead of "Other" when the category is Other (e.g. "Placement & Careers").
    customCategory: { type: String, trim: true, maxlength: 40 },
    logoUrl: { type: String, trim: true, maxlength: 500 },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    socials: {
      website: { type: String, trim: true, maxlength: 300 },
      instagram: { type: String, trim: true, maxlength: 300 },
      linkedin: { type: String, trim: true, maxlength: 300 },
      x: { type: String, trim: true, maxlength: 300 },
    },
    // New clubs start as "pending" and need a university admin's approval.
    status: { type: String, enum: CLUB_STATUSES, default: "pending" },
    statusReason: { type: String, trim: true, maxlength: 500 },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true }
);

clubSchema.index({ university: 1, slug: 1 }, { unique: true });
clubSchema.index({ status: 1, name: 1 });

module.exports = mongoose.model("Club", clubSchema);
module.exports.CLUB_CATEGORIES = CLUB_CATEGORIES;
module.exports.CLUB_STATUSES = CLUB_STATUSES;
