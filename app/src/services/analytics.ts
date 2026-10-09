/**
 * Behaviour analytics — tiny, queued, never in the way.
 *
 * Screens call `track('course_viewed', { courseId })`; events pile up in a
 * small in-memory queue and flush to the server in one batched POST every
 * 15 seconds (or sooner once 8 events gather, or when the app backgrounds).
 * Everything is fire-and-forget: a failure only means the queue is kept (up
 * to a cap) and retried on the next flush. Nothing ever blocks the UI.
 */

import { AppState, type AppStateStatus } from 'react-native';

import { api } from '@/services/api';

export type AnalyticsEventName =
  | 'app_opened'
  | 'course_viewed'
  | 'lesson_started'
  | 'lesson_completed'
  | 'checkout_started'
  | 'search';

type QueuedEvent = {
  event: AnalyticsEventName;
  courseId?: string;
  meta?: Record<string, unknown>;
  at: number;
};

const FLUSH_EVERY_MS = 15_000;
const FLUSH_AT_SIZE = 8;
const QUEUE_CAP = 100;

let queue: QueuedEvent[] = [];
let flushing = false;
let timer: ReturnType<typeof setInterval> | null = null;

async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue;
  queue = [];
  try {
    await api.trackEvents(batch);
  } catch {
    // Offline or server error — keep the events for the next flush (capped).
    queue = [...batch, ...queue].slice(-QUEUE_CAP);
  } finally {
    flushing = false;
  }
}

/** Record one behaviour event. O(1); the network work happens on the flush. */
export function track(event: AnalyticsEventName, options: { courseId?: string; meta?: Record<string, unknown> } = {}) {
  queue.push({ event, courseId: options.courseId, meta: options.meta, at: Date.now() });
  if (queue.length >= FLUSH_AT_SIZE) void flush();
}

/** Starts the flush timer + the background-flush listener. Idempotent. */
export function startAnalytics() {
  if (timer) return;
  timer = setInterval(() => void flush(), FLUSH_EVERY_MS);
  AppState.addEventListener('change', (state: AppStateStatus) => {
    // Ship whatever we have before the app disappears.
    if (state !== 'active') void flush();
  });
}
