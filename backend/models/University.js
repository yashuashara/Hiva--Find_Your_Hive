const mongoose = require("mongoose");

// A tenant. The platform starts with one university but every club, event and
// user is linked to one, so more can be added later without a rewrite.
const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    shortName: { type: String, trim: true, maxlength: 30 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("University", universitySchema);
