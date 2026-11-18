const multer = require("multer");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { MAX_IMAGE_BYTES, saveImage } = require("../services/storage");
const { audit } = require("../services/audit");

// Files are kept in memory (max 2 MB, one file) so their bytes can be checked
// before anything touches the disk.
const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
}).single("image");

// Turns multer errors into friendly API errors.
const receiveImage = (req, res, next) =>
  parseImage(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return next(new AppError(413, "Images must be 2 MB or smaller"));
    return next(new AppError(400, "Upload one image in the \"image\" field"));
  });

// POST /uploads/images — returns a public URL to use as a banner or logo.
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "Choose an image to upload");
  const saved = await saveImage(req.file.buffer);
  if (!saved) throw new AppError(415, "Only JPEG, PNG or WebP images are allowed");
  await audit(req.user, "upload.image", "Upload", saved.name, { bytes: saved.bytes, type: saved.type });
  res.status(201).json({ success: true, data: { url: saved.url } });
});

module.exports = { receiveImage, uploadImage };
