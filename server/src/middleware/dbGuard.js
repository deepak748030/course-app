import { isConnected } from '../config/db.js';
import { HttpError } from '../utils/http.js';

/**
 * Every route below /api (except /api/health) passes through here. While MongoDB is
 * unreachable the API answers a clean 503 instead of letting Mongoose throw per request.
 */
export function dbGuard(req, _res, next) {
  if (!isConnected()) {
    return next(new HttpError(503, 'Database is not connected yet. Is MongoDB running?'));
  }
  next();
}
