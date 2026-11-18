const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const AppError = require("../utils/AppError");
const config = require("../config/env");
const MongoRateLimitStore = require("./rateLimitStore");

const FIFTEEN_MIN = 15 * 60 * 1000;

// perUser: count signed-in users individually instead of per IP address.
// Many students share one campus Wi-Fi IP, so a pure per-IP limit would
// block a whole team of volunteers scanning tickets at a busy entrance.
// name: distinguishes each limiter's counters in a shared store.
const limiter = (limit, message, { perUser = false, windowMs = FIFTEEN_MIN, name = "default" } = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: config.rateLimitStore === "mongo" ? new MongoRateLimitStore(`rl:${name}`) : undefined,
    // If the counter store is briefly unreachable, let requests through
    // rather than taking the whole site down.
    passOnStoreError: true,
    keyGenerator: (req) =>
      perUser && req.session?.userId ? `user:${req.session.userId}` : `ip:${ipKeyGenerator(req.ip)}`,
    handler: (req, res, next) => next(new AppError(429, message)),
  });

// CSRF protection for cookie-based sessions.
// Browsers cannot attach a custom header to a cross-site request without a
// CORS preflight, and our CORS policy only allows known origins. So requiring
// this header on every state-changing request blocks forged form posts.
const requireCsrfHeader = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("X-Requested-With") !== "XMLHttpRequest") {
    return next(new AppError(403, "Missing required request header"));
  }
  next();
};

// Minimal access log: method, path (no query string), status, duration.
// No bodies, cookies or headers, so no passwords or student data end up in logs.
const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const path = req.originalUrl.split("?")[0];
    console.log(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
};

module.exports = { limiter, requireCsrfHeader, requestLogger };
