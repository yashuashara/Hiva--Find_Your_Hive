const h = require("./helpers");
const config = require("../config/env");
const MongoRateLimitStore = require("../middleware/rateLimitStore");
const { saveImage } = require("../services/storage");

beforeAll(() => h.startDb());
afterEach(() => h.clearDb());
afterAll(() => h.stopDb());

describe("Mongo rate-limit store (shared by serverless instances)", () => {
  test("counts hits within a window and starts a new window after expiry", async () => {
    const store = new MongoRateLimitStore("rl:test");
    store.init({ windowMs: 200 });
    expect((await store.increment("k")).totalHits).toBe(1);
    expect((await store.increment("k")).totalHits).toBe(2);
    await store.decrement("k");
    expect((await store.increment("k")).totalHits).toBe(2);
    await new Promise((r) => setTimeout(r, 250));
    expect((await store.increment("k")).totalHits).toBe(1);
    await store.resetKey("k");
    expect((await store.increment("k")).totalHits).toBe(1);
  });

  test("concurrent hits are all counted (atomic)", async () => {
    const store = new MongoRateLimitStore("rl:test");
    store.init({ windowMs: 60000 });
    await Promise.all(Array.from({ length: 25 }, () => store.increment("burst")));
    expect((await store.increment("burst")).totalHits).toBe(26);
  });

  test("two app instances share one limit", async () => {
    const original = config.rateLimitStore;
    config.rateLimitStore = "mongo";
    try {
      // Two separately created apps behave like two serverless instances.
      const a = h.createApp({ apiRateLimit: 3 });
      const b = h.createApp({ apiRateLimit: 3 });
      expect((await h.client(a).get("/api/campus/events")).status).toBe(200);
      expect((await h.client(b).get("/api/campus/events")).status).toBe(200);
      expect((await h.client(a).get("/api/campus/events")).status).toBe(200);
      expect((await h.client(b).get("/api/campus/events")).status).toBe(429);
    } finally {
      config.rateLimitStore = original;
    }
  });
});

describe("storage on serverless hosting", () => {
  test("refuses to write to the temporary disk when no Blob store is configured", async () => {
    const PNG = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const saved = { driver: config.storageDriver, serverless: config.isServerless };
    config.storageDriver = "local";
    config.isServerless = true;
    try {
      await expect(saveImage(PNG)).rejects.toMatchObject({ statusCode: 503 });
    } finally {
      config.storageDriver = saved.driver;
      config.isServerless = saved.serverless;
    }
  });
});
