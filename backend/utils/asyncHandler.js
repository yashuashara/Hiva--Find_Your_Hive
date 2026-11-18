// Wraps an async route handler so rejected promises reach the error handler
// instead of every controller needing its own try/catch.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
