/**
 * Minimal fixed-window rate limiter (in-memory) with bounded key cache to avoid OOM under
 * spoofed-IP floods. Good enough for a single API process; swap for Redis when scaling horizontally.
 */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, maxKeys = 20_000 } = {}) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.windowStart > windowMs) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now - entry.windowStart > windowMs) {
      if (!entry && hits.size >= maxKeys) {
        const oldestKey = hits.keys().next().value;
        if (oldestKey !== undefined) hits.delete(oldestKey);
      }
      entry = { windowStart: now, count: 0 };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.windowStart + windowMs - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests, slow down a little.' });
    }
    next();
  };
}
