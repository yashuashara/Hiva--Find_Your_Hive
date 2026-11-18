// An error whose message is safe to show to API clients.
// Anything that is NOT an AppError is treated as an internal error and its
// details are hidden from the response (but logged on the server).
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;
