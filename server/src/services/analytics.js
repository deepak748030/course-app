/**
 * Analytics engine.
 *
 * Two jobs:
 *  1. count every /api request in memory and flush the daily total to DailyStat
 *     (so "hits per day/week/month" is one cheap query, not one write per hit);
 *  2. record behaviour events (app views, lesson progress, signups, payments)
 *     into AnalyticsEvent for funnels, retention and recommendations.
 *
 * Money-trusted events (signup, order_paid) are emitted by the server itself —
 * a client can never fake them.
 */
import { isConnected } from '../config/db.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { DailyStat } from '../models/DailyStat.js';

export const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------- request counting
let bucket = { date: todayStr(), requests: 0 };
let flushing = false;

async function flush() {
  if (flushing || bucket.requests === 0 || !isConnected()) return;
  const done = bucket;
  bucket = { date: todayStr(), requests: 0 };
  flushing = true;
  try {
    await DailyStat.updateOne({ date: done.date }, { $inc: { requests: done.requests } }, { upsert: true });
  } catch {
    // DB blip — put the counts back so they land on the next flush.
    bucket = { date: done.date, requests: bucket.requests + done.requests };
  } finally {
    flushing = false;
  }
}

/** Called once per /api request. O(1), never awaits, never throws. */
export function countRequest() {
  if (bucket.date !== todayStr()) void flush();
  bucket.requests += 1;
}

/** Express middleware form of the above. */
export const requestCounter = (_req, _res, next) => {
  countRequest();
  next();
};

// Flush every 30 s and once more when the process shuts down.
setInterval(() => void flush(), 30_000).unref?.();
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => void flush());
}

// ---------------------------------------------------------------- event tracking
/**
 * Record one behaviour event. Fire-and-forget: analytics must never break a
 * request, and must never be written while the DB is down.
 */
export function trackEvent({ userId = null, event, courseId = null, meta = {} }) {
  if (!isConnected()) return;
  AnalyticsEvent.create({ user: userId, event, course: courseId, meta }).catch(() => {});
}

/**
 * Bulk insert from the app's POST /api/analytics/events. Events arrive in small
 * batches; timestamps the app reports are honoured unless they are nonsense.
 */
export function trackBatch({ userId, events }) {
  if (!isConnected() || !Array.isArray(events) || events.length === 0) return;
  const now = Date.now();
  const docs = events.slice(0, 50).map((entry) => {
    const at = Number(entry.at);
    // Accept client timestamps only from the last 7 days and never from the future.
    const createdAt = Number.isFinite(at) && at <= now && at >= now - 7 * 864e5 ? new Date(at) : undefined;
    return {
      user: userId,
      event: String(entry.event || '').slice(0, 40),
      course: entry.courseId || null,
      meta: entry.meta && typeof entry.meta === 'object' ? entry.meta : {},
      ...(createdAt ? { createdAt } : {}),
    };
  }).filter((doc) => doc.event);
  if (docs.length) AnalyticsEvent.insertMany(docs, { ordered: false }).catch(() => {});
}
