// Vercel serverless function: every /api/* request is rewritten here
// (see vercel.json) and handled by the same Express app used locally.
const { getApp } = require("../backend/serverless");

module.exports = async (req, res) => {
  let app;
  try {
    app = await getApp();
  } catch (err) {
    console.error("[startup] could not initialise the API:", err.message);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "Service temporarily unavailable. Please try again shortly." }));
    return;
  }
  return app(req, res);
};
