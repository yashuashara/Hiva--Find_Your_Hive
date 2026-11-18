const mongoose = require("mongoose");

// A student following a club, used for recommendations and the club's
// follower count. Private: follower lists are never exposed.
const clubFollowSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
  },
  { timestamps: true }
);

clubFollowSchema.index({ user: 1, club: 1 }, { unique: true });
clubFollowSchema.index({ club: 1 });

module.exports = mongoose.model("ClubFollow", clubFollowSchema);
