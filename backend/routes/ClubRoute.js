const express = require("express");
const router = express.Router();

const clubs = require("../controller/ClubController");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

router.get("/", validate({ query: s.listClubsQuery }), clubs.listClubs);
router.get("/mine", requireAuth, clubs.myClubs);
router.post("/", requireAuth, validate({ body: s.createClubSchema }), clubs.createClub);
router.get("/:slug", validate({ params: s.clubSlugParam }), clubs.getClub);
router.patch("/:id", requireAuth, validate({ params: s.clubIdParam, body: s.updateClubSchema }), clubs.updateClub);

// Team
router.get("/:id/members", requireAuth, validate({ params: s.clubIdParam }), clubs.listMembers);
router.post("/:id/members", requireAuth, validate({ params: s.clubIdParam, body: s.addMemberSchema }), clubs.addMember);
router.post("/:id/members/:memberId/approve", requireAuth, validate({ params: s.memberParam }), clubs.approveMember);
router.delete("/:id/members/:memberId", requireAuth, validate({ params: s.memberParam }), clubs.removeMember);

// Admin review: approve | reject | suspend | reinstate
router.post("/:id/:action", requireAuth, validate({ params: s.reviewParam, body: s.reasonBody }), clubs.reviewClub);

module.exports = router;
