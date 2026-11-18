const { ZodError } = require("zod");
const AppError = require("../utils/AppError");
const config = require("../config/env");

// 404 for unknown API routes.
const notFound = (req, res, next) => {
  next(new AppError(404, "Route not found"));
};

// Single place that turns errors into JSON responses.
// Client-facing messages never include stack traces or database internals.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = 500;
  let message = "Something went wrong. Please try again.";
  let details;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    message = "Invalid input";
    details = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid identifier";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = "Invalid input";
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    status = 409;
    message = "This record already exists";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Request body too large";
  } else if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    // Client errors raised by libraries (e.g. a missing static file).
    status = err.status;
    message = status === 404 ? "Not found" : "Bad request";
  }

  if (status >= 500 && !config.isTest) {
    // Log the full error server-side only. Request bodies are deliberately not
    // logged because they may contain passwords or student details.
    console.error(`[error] ${req.method} ${req.path}`, err);
  }

  const body = { success: false, message };
  if (details) body.details = details;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
