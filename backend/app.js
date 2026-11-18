// Builds the Express app without starting a server, so the same app can be
// used by index.js (real server) and by the automated tests.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const mongoose = require("mongoose");

const config = require("./config/env");
const { loadUser } = require("./middleware/auth");
const { limiter, requireCsrfHeader, requestLogger } = require("./middleware/security");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { SESSION_COOKIE } = require("./controller/AuthController");

function createApp({ sessionStore, authRateLimit, apiRateLimit } = {}) {
  if (config.isProd && !sessionStore) {
    throw new Error("A persistent session store is required in production");
  }

  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Requests without an Origin header (curl, health checks, same-origin)
        // are allowed; browsers on other origins must be on the allow-list.
        if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
    })
  );
  if (!config.isTest) app.use(requestLogger);
  app.use(express.json({ limit: "100kb" }));

  // Uploaded banners/logos. Public by design. Only image files ever land in
  // this folder (checked by content when uploaded), and they are served with
  // nosniff so a browser never treats one as HTML/script. Cross-origin
  // loading is allowed so the frontend on another domain can show them.
  // (Only used with the local storage driver; Vercel Blob serves its own files.)
  app.use(
    "/uploads",
    express.static(config.uploadDir, {
      index: false,
      dotfiles: "deny",
      fallthrough: false,
      immutable: true,
      maxAge: "365d",
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
      },
    })
  );

  // Health check for load balancers / uptime monitors (no auth, no data).
  app.get("/api/health", (req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", db: dbUp ? "up" : "down" });
  });

  app.use("/api", requireCsrfHeader);

  app.use(
    session({
      name: SESSION_COOKIE,
      secret: config.sessionSecret,
      store: sessionStore, // undefined => in-memory store (dev/test only)
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: config.cookieSameSite,
        maxAge: config.sessionMaxAgeMs,
      },
    })
  );
  // After the session (so signed-in users are limited individually), before
  // loading the user from the database (so floods are cut off cheaply).
  app.use(
    "/api",
    limiter(apiRateLimit ?? config.rateLimit.apiPer15Min, "Too many requests. Please slow down.", { perUser: true, name: "api" })
  );
  app.use(loadUser);

  const authLimiter = limiter(
    authRateLimit ?? config.rateLimit.authPer15Min,
    "Too many sign-in attempts. Please wait 15 minutes and try again.",
    { name: "auth" }
  );
  app.use("/api/auth", require("./routes/AuthRoute")(authLimiter));
  app.use("/api/campus", require("./routes/EventRoute"));
  app.use("/api/clubs", require("./routes/ClubRoute"));
  app.use("/api/me", require("./routes/MeRoute"));
  app.use("/api/admin", require("./routes/AdminRoute"));
  app.use("/api/analytics", require("./routes/AnalyticsRoute"));
  app.use("/api/uploads", require("./routes/UploadRoute"));

  app.use("/api", notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
