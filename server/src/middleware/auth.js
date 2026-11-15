import { User } from '../models/User.js';
import { cacheRemember } from '../services/cache.js';
import { verifyToken } from '../utils/token.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const AUTH_USER_TTL_MS = 60_000;

/**
 * Load an authenticated user with L1/Redis caching (60s TTL, invalidated immediately on
 * profile/credential/block/role changes) so every API call avoids a remote DB round-trip.
 */
export async function loadAuthUser(userId) {
  if (!userId) return null;
  return cacheRemember(`auth:user:${userId}`, AUTH_USER_TTL_MS, async () => {
    const doc = await User.findById(userId).select('-passwordHash -__v').lean();
    return doc || null;
  });
}

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

  const user = await loadAuthUser(payload.sub);
  if (!user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  if (user.blocked) throw new HttpError(403, 'This account is blocked');
  if ((user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
    throw new HttpError(401, 'Session expired or invalid — sign in again');
  }

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
      const user = await loadAuthUser(payload.sub);
      if (user && !user.blocked && (user.tokenVersion ?? 0) === (payload.tv ?? 0)) req.user = user;
    } catch {
      // invalid token on an optional-auth route — treat as anonymous
    }
  }
  next();
});
