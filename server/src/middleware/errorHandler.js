import mongoose from 'mongoose';
import { isProd } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Thrown HttpError with a status code.
  if (typeof err.status === 'number' && err.message) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Mongoose validation problems → 400 with the first readable message.
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: Object.values(err.errors)[0]?.message || 'Invalid data' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for "${err.path}"` });
  }
  // Duplicate unique key.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(409).json({ error: `That ${field} is already taken` });
  }
  // Malformed JSON body.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  console.error('[api] unhandled error:', err);
  res.status(500).json({
    error: 'Something went wrong on the server',
    ...(isProd ? {} : { detail: err.message }),
  });
}
