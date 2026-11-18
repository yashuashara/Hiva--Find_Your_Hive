// Image storage for event banners and club logos.
//
// Safety rules for user uploads:
//  - Only JPEG, PNG and WebP, identified by the file's actual bytes (the
//    browser-supplied type and file name are ignored, so a renamed .html or
//    .svg cannot slip through). SVG is never accepted (it can carry scripts).
//  - Files get a random name; the original name is discarded.
//  - Served with the matching Content-Type and "nosniff".
//
// Files live on local disk (UPLOAD_DIR). Hosts with ephemeral disks (e.g.
// Render's free tier) lose files on redeploy: mount a persistent disk there,
// or replace saveImage() with an object-storage upload (S3, Cloudinary, ...).
// Callers only depend on saveImage() returning a public URL.
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const config = require("../config/env");

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Returns the file extension for a supported image, judged by magic bytes.
function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Returns { url, name, bytes, type }, or null if the bytes are not a
// supported image. Throws AppError(503) if no usable storage is configured.
async function saveImage(buffer) {
  const ext = detectImageType(buffer);
  if (!ext) return null;
  const name = `${crypto.randomBytes(16).toString("hex")}.${ext}`;

  if (config.storageDriver === "blob") {
    // Vercel Blob (BLOB_READ_WRITE_TOKEN is added automatically when a Blob
    // store is connected to the Vercel project).
    const { put } = require("@vercel/blob");
    const blob = await put(`uploads/${name}`, buffer, {
      access: "public",
      contentType: MIME[ext],
      addRandomSuffix: false,
      cacheControlMaxAge: 365 * 24 * 60 * 60,
    });
    return { url: blob.url, name, bytes: buffer.length, type: ext };
  }

  if (config.isServerless) {
    // Serverless disks are temporary: files would silently disappear.
    const AppError = require("../utils/AppError");
    throw new AppError(503, "Image uploads are not configured on this server yet");
  }

  await fs.mkdir(config.uploadDir, { recursive: true });
  await fs.writeFile(path.join(config.uploadDir, name), buffer, { flag: "wx" });
  return { url: `${config.publicApiUrl}/uploads/${name}`, name, bytes: buffer.length, type: ext };
}

module.exports = { MAX_IMAGE_BYTES, detectImageType, saveImage };
