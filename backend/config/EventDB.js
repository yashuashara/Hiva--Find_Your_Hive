const mongoose = require("mongoose");

// Connects to MongoDB using the URI from config (never hardcoded).
// Throws on failure so the caller decides whether to exit.
const connectDB = async (uri) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ MongoDB connected (${mongoose.connection.name})`);
  return mongoose.connection;
};

module.exports = connectDB;
