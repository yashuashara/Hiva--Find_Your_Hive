// Validates req.body / req.params / req.query against zod schemas.
// Unknown fields are stripped, so clients can never set server-controlled
// fields such as role, seatsAvailable or payment status.
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;
