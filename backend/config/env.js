// Central place for configuration. Everything that differs between
// development and production comes from environment variables, so the
// app never depends on localhost or hardcoded secrets in production.
const path = require("path");
const crypto = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const isTest = NODE_ENV === "test";

function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return typeof devFallback === "function" ? devFallback() : devFallback;
}

const sessionSecret = required("SESSION_SECRET", () => {
  if (!isTest) {
    console.warn("⚠️  SESSION_SECRET not set — using a random secret. Sessions reset on every restart.");
  }
  return crypto.randomBytes(32).toString("hex");
});

if (isProd && sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters in production");
}

const sameSite = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
if (!["lax", "strict", "none"].includes(sameSite)) {
  throw new Error("COOKIE_SAMESITE must be one of: lax, strict, none");
}

const config = {
  env: NODE_ENV,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongoUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/campus_events"),
  sessionSecret,
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  cookieSameSite: sameSite,
  // Secure cookies are mandatory in production (HTTPS) and whenever SameSite=None.
  cookieSecure: isProd || sameSite === "none",
  clientOrigins: (process.env.CLIENT_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Number of reverse proxies in front of the app (Render/Railway/Nginx = 1).
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase(),
  // The university this deployment serves. This is tenant data only; it does
  // not imply the university endorses or operates the platform.
  defaultUniversity: {
    slug: process.env.DEFAULT_UNIVERSITY_SLUG || "mit-wpu",
    name: process.env.DEFAULT_UNIVERSITY_NAME || "MIT World Peace University",
    shortName: process.env.DEFAULT_UNIVERSITY_SHORT_NAME || "MIT-WPU",
  },
  // Time zone for dates in emails and day-by-day analytics.
  timeZone: process.env.APP_TIME_ZONE || "Asia/Kolkata",
  // Public base URL of this API (used to build links to uploaded images).
  publicApiUrl: (process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 5000}`).trim().replace(/\/+$/, ""),
  // Where uploaded images are stored on disk.
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads"),
  // Public URL of the frontend, used for links in emails.
  appUrl: (process.env.APP_URL || (process.env.CLIENT_ORIGINS || "http://localhost:3000").split(",")[0]).trim().replace(/\/+$/, ""),
  // Optional SMTP settings. Leave SMTP_HOST empty to disable email.
  email: {
    enabled: !!process.env.SMTP_HOST,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || "Event Engine <no-reply@localhost>",
  },
  rateLimit: {
    authPer15Min: Number(process.env.AUTH_RATE_LIMIT || 10),
    // Per signed-in user (per IP for anonymous visitors). A scanner polling
    // attendance plus a scan every few seconds stays well under this.
    apiPer15Min: Number(process.env.API_RATE_LIMIT || 1500),
  },
};

module.exports = config;
