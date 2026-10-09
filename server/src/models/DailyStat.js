import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One row per calendar day: the rollup that makes "requests per day/week/month"
 * a single cheap query. Per-request counting lives in memory (services/analytics.js)
 * and flushes here every 30 seconds, so a busy API writes ~2 880 documents per
 * day instead of one per hit.
 */
const dailyStatSchema = new Schema(
  {
    /** Local calendar day, YYYY-MM-DD (server timezone). */
    date: { type: String, required: true, unique: true },
    requests: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const DailyStat = mongoose.model('DailyStat', dailyStatSchema);
