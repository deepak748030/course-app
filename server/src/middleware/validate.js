import { HttpError } from '../utils/http.js';

/**
 * Validate req.body against a zod schema. The parsed (coerced, stripped) value
 * replaces req.body so handlers only ever see clean data.
 */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    return next(new HttpError(400, 'Validation failed', result.error.flatten()));
  }
  req.body = result.data;
  next();
};

/**
 * Validate req.query against a zod schema. Express 4 exposes req.query through a
 * getter, so the parsed value is stored on req.validatedQuery instead.
 */
export const validateQuery = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.query ?? {});
  if (!result.success) {
    return next(new HttpError(400, 'Invalid query parameters', result.error.flatten()));
  }
  req.validatedQuery = result.data;
  next();
};

/** Validate req.params. Parsed value replaces req.params. */
export const validateParams = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.params ?? {});
  if (!result.success) {
    return next(new HttpError(400, 'Invalid URL parameters', result.error.flatten()));
  }
  req.params = result.data;
  next();
};
