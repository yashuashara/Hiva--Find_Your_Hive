// Entry point for serverless hosting (Vercel). See /api/index.js.
//
// A serverless instance handles many requests over its lifetime, so the
// database connection and the Express app are created once per instance and
// reused, instead of reconnecting on every request.
const mongoose = require("mongoose");
const { MongoStore } = require("connect-mongo");

const config = require("./config/env");
const connectDB = require("./config/EventDB");
const createApp = require("./app");

let appPromise = null;

function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      await connectDB(config.mongoUri);
      const sessionStore = MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "sessions",
        ttl: config.sessionMaxAgeMs / 1000,
      });
      return createApp({ sessionStore });
    })().catch((err) => {
      appPromise = null; // allow the next request to retry
      throw err;
    });
  }
  return appPromise;
}

module.exports = { getApp };
