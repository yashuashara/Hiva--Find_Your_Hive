const mongoose = require("mongoose");

// Connects to MongoDB using the URI from config (never hardcoded).
// Throws on failure so the caller decides whether to exit.
const connectDB = async (uri) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    // Serverless instances each hold their own pool; keep them small so many
    // instances stay under the database's connection limit (Atlas free: 500).
    maxPoolSize: process.env.VERCEL ? 5 : 20,
  });
  console.log(`✅ MongoDB connected (${mongoose.connection.name})`);
  return mongoose.connection;
};

module.exports = connectDB;
