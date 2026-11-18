const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { hashPassword, verifyPassword, getDummyHash } = require("../utils/password");

const SESSION_COOKIE = "ee.sid";

// Starts a fresh session for the user. Regenerating the session ID on login
// prevents session-fixation attacks.
function startSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user._id.toString();
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

// POST /api/auth/signup — anyone can create a STUDENT account.
// The role field is not accepted from the client (stripped by validation),
// so nobody can sign themselves up as an organizer or admin.
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const emailName = email.split("@")[0];
  if (emailName.length >= 4 && password.toLowerCase().includes(emailName)) {
    throw new AppError(400, "Password must not contain your email name");
  }

  const exists = await User.exists({ email });
  if (exists) throw new AppError(409, "An account with this email already exists");

  const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
  await startSession(req, user);
  res.status(201).json({ success: true, data: user });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");

  // Always run a hash comparison so response time does not reveal whether
  // the email is registered.
  const ok = await verifyPassword(password, user ? user.passwordHash : await getDummyHash());
  if (!user || !ok) throw new AppError(401, "Invalid email or password");
  if (user.status !== "active") throw new AppError(403, "This account has been suspended");

  user.lastLoginAt = new Date();
  await user.save();
  await startSession(req, user);
  res.json({ success: true, data: user });
});

// POST /api/auth/logout
const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(SESSION_COOKIE);
    res.json({ success: true, message: "Signed out" });
  });
};

// GET /api/auth/me
const me = (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { signup, login, logout, me, SESSION_COOKIE };
