import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A learner behaviour event — the raw material for analytics, funnels and
 * recommendations. Written by the app (views, lesson progress, searches) and by
 * the server itself for money-trusted moments (signup, paid order), so those
 * two can never be faked from a client.
 *
 * Events older than ~13 months are dropped automatically (TTL): monthly
 * reporting stays available forever through the DailyStat rollups + the
 * orders/users collections, while this collection never grows unbounded.
 */
const eventSchema = new Schema(
  {
    /** Null for anonymous visitors (browsing before sign-in). */
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    /** e.g. app_opened · course_viewed · lesson_started · checkout_started · order_paid · signup */
    event: { type: String, required: true, trim: true, maxlength: 40, index: true },
    /** The course involved, when the event is about one. */
    course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    /** Small free-form payload (search query, lesson id, …). Keep it tiny. */
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// Dashboards group by day/event and by user; the TTL keeps the collection bounded.
eventSchema.index({ createdAt: -1 });
eventSchema.index({ event: 1, createdAt: -1 });
eventSchema.index({ course: 1, event: 1 });
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

export const AnalyticsEvent = mongoose.model('AnalyticsEvent', eventSchema);
