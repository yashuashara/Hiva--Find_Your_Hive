const User = require("../models/User");
const AppError = require("../utils/AppError");

const ADMIN_ROLES = ["uni_admin", "super_admin"];

// Loads the logged-in user (if any) from the session onto req.user.
// The role always comes from the database, never from the client.
const loadUser = async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return next();

    const user = await User.findById(userId);
    if (!user || user.status !== "active") {
      // Account deleted or suspended: end the session.
      return req.session.destroy(() => next());
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) return next(new AppError(401, "Please sign in to continue"));
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError(401, "Please sign in to continue"));
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, "You do not have permission to do this"));
  }
  next();
};

const requireAdmin = requireRole(...ADMIN_ROLES);

module.exports = { loadUser, requireAuth, requireRole, requireAdmin, ADMIN_ROLES };
