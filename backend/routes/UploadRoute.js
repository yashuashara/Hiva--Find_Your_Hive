const express = require("express");
const router = express.Router();

const { receiveImage, uploadImage } = require("../controller/UploadController");
const { requireAuth } = require("../middleware/auth");
const { limiter } = require("../middleware/security");

// At most 30 images per user per hour, to stop anyone filling the disk.
const uploadLimiter = limiter(30, "Upload limit reached. Please try again later.", {
  perUser: true,
  windowMs: 60 * 60 * 1000,
});

router.post("/images", requireAuth, uploadLimiter, receiveImage, uploadImage);

module.exports = router;
