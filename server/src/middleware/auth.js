import { User } from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { HttpError, asyncHandler } from '../utils/http.js';

/** Requires a valid Bearer token and loads the user onto req.user. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Authentication required');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Session expired or invalid — sign in again');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  if (user.blocked) throw new HttpError(403, 'This account is blocked');

  req.user = user;
  next();
});

/** Must run after requireAuth. */
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(new HttpError(403, 'Admin access required'));
  }
  next();
}

/** Attaches the user when a valid token is present; never blocks the request. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7));
      const user = await User.findById(payload.sub);
      if (user && !user.blocked) req.user = user;
    } catch {
      // invalid token on an optional-auth route — treat as anonymous
    }
  }
  next();
});
