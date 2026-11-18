// A MongoDB-backed store for express-rate-limit.
//
// On serverless hosting every request may run in a different instance, so
// in-memory counters would reset constantly and limits would never trigger.
// This store keeps one small document per key in the "ratelimits"
// collection; a TTL index deletes them when their window expires.
const mongoose = require("mongoose");

const COLLECTION = "ratelimits";
let indexReady = null;

function collection() {
  const coll = mongoose.connection.db.collection(COLLECTION);
  if (!indexReady) {
    indexReady = coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((err) => {
      indexReady = null;
      throw err;
    });
  }
  return coll;
}

class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = `${prefix}:`;
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  // Atomically starts a new window or adds one hit to the current window.
  async increment(key) {
    const now = new Date();
    const expired = { $or: [{ $eq: [{ $type: "$expiresAt" }, "missing"] }, { $lte: ["$expiresAt", now] }] };
    const doc = await collection().findOneAndUpdate(
      { _id: this.prefix + key },
      [
        {
          $set: {
            hits: { $cond: [expired, 1, { $add: ["$hits", 1] }] },
            expiresAt: { $cond: [expired, new Date(now.getTime() + this.windowMs), "$expiresAt"] },
          },
        },
      ],
      { upsert: true, returnDocument: "after" }
    );
    const value = doc && doc.value !== undefined ? doc.value : doc; // driver version differences
    return { totalHits: value.hits, resetTime: value.expiresAt };
  }

  async decrement(key) {
    await collection().updateOne({ _id: this.prefix + key, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await collection().deleteOne({ _id: this.prefix + key });
  }
}

module.exports = MongoRateLimitStore;
