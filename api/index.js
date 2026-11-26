// Vercel serverless function: every /api/* request is rewritten here
// (see vercel.json) and handled by the same Express app used locally.
//
// The app is loaded inside the handler (not at the top of the file) so that
// configuration problems, such as a missing environment variable, produce a
// clear 503 response and a readable message in the Vercel logs instead of a
// generic "function invocation failed" crash.
let getApp;

module.exports = async (req, res) => {
  let app;
  try {
    getApp = getApp || require("../backend/serverless").getApp;
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
