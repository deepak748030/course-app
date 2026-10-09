import { trackBatch } from '../services/analytics.js';
import { asyncHandler } from '../utils/http.js';

/**
 * POST /api/analytics/events — the app flushes small batches of behaviour
 * events (course views, lesson starts, searches…). Accepts anonymously too,
 * so pre-sign-in browsing is captured; a valid token attaches the user.
 *
 * 202 + fire-and-forget: the app must never wait on analytics.
 */
export const trackEvents = asyncHandler(async (req, res) => {
  trackBatch({ userId: req.user?._id ?? null, events: req.body.events });
  res.status(202).json({ ok: true });
});
