// Creates (or promotes) the platform super admin.
//
// This runs on the server only. Admin rights are never granted through the
// public sign-up API, so nobody can claim them by registering an email first.
//
// Usage (PowerShell):
//   $env:SUPER_ADMIN_PASSWORD = "a-long-unique-password"; npm run create-admin; Remove-Item Env:SUPER_ADMIN_PASSWORD
// Usage (bash):
//   SUPER_ADMIN_PASSWORD='a-long-unique-password' npm run create-admin
//
// The email comes from SUPER_ADMIN_EMAIL in backend/.env.
// If the account already exists, it is promoted and the password is only
// changed when SUPER_ADMIN_PASSWORD is provided.
const mongoose = require("mongoose");
const config = require("../config/env");
const connectDB = require("../config/EventDB");
const User = require("../models/User");
const { hashPassword } = require("../utils/password");
const { getDefaultUniversity } = require("../services/university");
const { audit } = require("../services/audit");

async function main() {
  const email = config.superAdminEmail;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email) throw new Error("Set SUPER_ADMIN_EMAIL in backend/.env first");
  if (password !== undefined && password.length < 12) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters");
  }

  await connectDB(config.mongoUri);
  const university = await getDefaultUniversity();
  const existing = await User.findOne({ email });

  if (existing) {
    const from = existing.role;
    existing.role = "super_admin";
    existing.status = "active";
    if (!existing.university) existing.university = university._id;
    if (password) existing.passwordHash = await hashPassword(password);
    await existing.save();
    await audit(null, "user.role_change", "User", existing._id, { from, to: "super_admin", via: "create-admin script" });
    console.log(`✅ ${email} is now super_admin${password ? " (password updated)" : ""}`);
  } else {
    if (!password) throw new Error("No account exists yet — set SUPER_ADMIN_PASSWORD to create it");
    const user = await User.create({
      email,
      name: "Platform Admin",
      role: "super_admin",
      university: university._id,
      passwordHash: await hashPassword(password),
    });
    await audit(null, "user.create_super_admin", "User", user._id, { via: "create-admin script" });
    console.log(`✅ Created super_admin account for ${email}`);
  }
}

main()
  .catch((err) => {
    console.error("❌", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
