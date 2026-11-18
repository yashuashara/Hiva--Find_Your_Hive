const express = require("express");

const { signup, login, logout, me, updateMe } = require("../controller/AuthController");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { signupSchema, loginSchema, updateProfileSchema } = require("../validators/schemas");

// Built per app instance; `authLimiter` is injected by app.js so tests can
// configure it.
module.exports = (authLimiter) => {
  const router = express.Router();
  router.post("/signup", authLimiter, validate({ body: signupSchema }), signup);
  router.post("/login", authLimiter, validate({ body: loginSchema }), login);
  router.post("/logout", logout);
  router.get("/me", requireAuth, me);
  router.patch("/me", requireAuth, validate({ body: updateProfileSchema }), updateMe);
  return router;
};
