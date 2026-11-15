import { Notification } from '../models/Notification.js';
import { PushToken } from '../models/PushToken.js';
import { cacheRemember, invalidateCache } from '../services/cache.js';
import { isExpoPushToken } from '../services/push.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const shape = (n) => ({
  id: String(n._id),
  title: n.title,
  body: n.body,
  kind: n.kind,
  courseId: n.course?.slug || null,
  createdAt: n.createdAt,
});

/** GET /api/notifications — the learner's inbox: announcements plus their own, newest first, one page at a time. */
export const listInbox = asyncHandler(async (req, res) => {
  const { limit, before, since } = req.validatedQuery;
  const mine = { $or: [{ audience: 'all' }, { user: req.user._id }] };
  const filter = before ? { $and: [mine, { createdAt: { $lt: new Date(before) } }] } : mine;
  const unreadFilter = since ? { $and: [mine, { createdAt: { $gt: new Date(since) } }] } : mine;

  const [rows, unreadCount] = await Promise.all([
    Notification.find(filter)
      .select('title body kind course createdAt')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('course', 'slug')
      .lean(),
    // Unread = arrived after the time the learner last opened the inbox (everything, before their first visit).
    Notification.countDocuments(unreadFilter),
  ]);
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(shape);

  res.json({ items, hasMore, unreadCount });
});

/** POST /api/notifications/push-token — called by the app on launch; deduplicated via cache for 1h. */
export const registerPushToken = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;
  if (!isExpoPushToken(token)) throw new HttpError(400, 'Not an Expo push token');
  const cleanPlatform = platform || 'unknown';
  await cacheRemember(`push:token:${req.user._id}:${token}:${cleanPlatform}`, 60 * 60_000, async () => {
    await PushToken.findOneAndUpdate(
      { token },
      { user: req.user._id, platform: cleanPlatform, lastSeenAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return true;
  });
  res.json({ ok: true });
});

/** DELETE /api/notifications/push-token — the device signs out, so it stops receiving this account's pushes. */
export const unregisterPushToken = asyncHandler(async (req, res) => {
  invalidateCache(`push:token:${req.user._id}:`);
  await PushToken.deleteOne({ token: req.body.token, user: req.user._id });
  res.json({ ok: true });
});
