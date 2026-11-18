const mongoose = require("mongoose");
const { MongoStore } = require("connect-mongo");

const config = require("./config/env");
const connectDB = require("./config/EventDB");
const createApp = require("./app");

async function start() {
  // Connect first, then accept traffic, so requests never hit a missing DB.
  await connectDB(config.mongoUri);

  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "sessions",
    ttl: config.sessionMaxAgeMs / 1000,
  });

  const app = createApp({ sessionStore });
  const server = app.listen(config.port, () => {
    console.log(`🚀 API listening on port ${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err.message);
  process.exit(1);
});
