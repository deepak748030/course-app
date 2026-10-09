import { AnalyticsEvent } from '../../models/AnalyticsEvent.js';
import { Course } from '../../models/Course.js';
import { DailyStat } from '../../models/DailyStat.js';
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { trackEvent } from '../../services/analytics.js';
import { asyncHandler } from '../../utils/http.js';

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (date) => date.toISOString().slice(0, 10);

/** Calendar skeleton for the period so days with zero activity still chart. */
function lastNDays(n) {
  const days = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * DAY);
    days.push({ key: dayKey(d), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) });
  }
  return days;
}

async function distinctUsersSince(since) {
  const ids = await AnalyticsEvent.distinct('user', { user: { $ne: null }, createdAt: { $gte: since } });
  return ids.length;
}

/**
 * GET /api/admin/analytics/overview?days=30 — one call gives the dashboard
 * everything its Analytics page renders: KPIs, the per-day series (requests,
 * uniques, views, checkouts, purchases, revenue), the funnel, peak hours and
 * the "most viewed / most bought / most searched" boards.
 */
export const overview = asyncHandler(async (req, res) => {
  // The admin opening the page counts as a page view of the console itself.
  trackEvent({ userId: req.user._id, event: 'admin_view' });

  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);
  const now = new Date();
  const start = new Date(now.getTime() - (days - 1) * DAY);
  start.setUTCHours(0, 0, 0, 0);
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const skeleton = lastNDays(days);

  // ---- per-day event breakdown (views / checkouts / uniques) -------------------
  const eventDays = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        courseViews: { $sum: { $cond: [{ $eq: ['$event', 'course_viewed'] }, 1, 0] } },
        checkouts: { $sum: { $cond: [{ $eq: ['$event', 'checkout_started'] }, 1, 0] } },
        lessonStarts: { $sum: { $cond: [{ $eq: ['$event', 'lesson_started'] }, 1, 0] } },
        uniques: { $addToSet: '$user' },
      },
    },
  ]);

  // ---- per-day paid orders ------------------------------------------------------
  const orderDays = await Order.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        purchases: { $sum: 1 },
        revenueInr: { $sum: '$amountInr' },
      },
    },
  ]);

  // ---- per-day request counts (the cheap rollup) --------------------------------
  const requestRows = await DailyStat.find({ date: { $gte: skeleton[0].key } }).select('date requests').lean();

  const eventByDay = new Map(eventDays.map((row) => [row._id, row]));
  const orderByDay = new Map(orderDays.map((row) => [row._id, row]));
  const requestByDay = new Map(requestRows.map((row) => [row.date, row.requests]));

  const daily = skeleton.map(({ key, label }) => {
    const ev = eventByDay.get(key);
    const od = orderByDay.get(key);
    return {
      date: key,
      label,
      requests: requestByDay.get(key) || 0,
      uniques: ev ? ev.uniques.filter(Boolean).length : 0,
      courseViews: ev?.courseViews || 0,
      checkouts: ev?.checkouts || 0,
      lessonStarts: ev?.lessonStarts || 0,
      purchases: od?.purchases || 0,
      revenueInr: od?.revenueInr || 0,
    };
  });

  // ---- KPIs ----------------------------------------------------------------------
  const [dau, wau, mau] = await Promise.all([
    distinctUsersSince(startOfToday),
    distinctUsersSince(new Date(now.getTime() - 6 * DAY)),
    distinctUsersSince(new Date(now.getTime() - 29 * DAY)),
  ]);

  const [signupsPeriod, signupsToday, ordersToday] = await Promise.all([
    User.countDocuments({ role: 'user', createdAt: { $gte: start } }),
    User.countDocuments({ role: 'user', createdAt: { $gte: startOfToday } }),
    Order.countDocuments({ status: 'paid', createdAt: { $gte: startOfToday } }),
  ]);

  const totals = daily.reduce(
    (acc, row) => {
      acc.requests += row.requests;
      acc.courseViews += row.courseViews;
      acc.checkouts += row.checkouts;
      acc.purchases += row.purchases;
      acc.revenueInr += row.revenueInr;
      return acc;
    },
    { requests: 0, courseViews: 0, checkouts: 0, purchases: 0, revenueInr: 0 }
  );
  const revenueToday = daily[daily.length - 1]?.revenueInr || 0;

  // ---- peak hours (last 30 days regardless of the selected period) --------------
  const hourRows = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: new Date(now.getTime() - 29 * DAY) } } },
    { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourRows.find((row) => row._id === hour)?.count || 0,
  }));

  // ---- boards --------------------------------------------------------------------
  const topViewedRows = await AnalyticsEvent.aggregate([
    { $match: { event: 'course_viewed', course: { $ne: null }, createdAt: { $gte: start } } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  const topViewed = await fillCourseTitles(topViewedRows, 'count');

  const topPurchasedRows = await Order.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: start } } },
    { $group: { _id: '$course', count: { $sum: 1 }, revenueInr: { $sum: '$amountInr' } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  const topPurchased = await fillCourseTitles(topPurchasedRows, 'count', 'revenueInr');

  const topSearches = await AnalyticsEvent.aggregate([
    { $match: { event: 'search', 'meta.query': { $exists: true }, createdAt: { $gte: start } } },
    { $group: { _id: { $toLower: '$meta.query' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
    { $project: { _id: 0, query: '$_id', count: 1 } },
  ]);

  res.json({
    periodDays: days,
    kpis: {
      requests: { total: totals.requests, today: daily[daily.length - 1]?.requests || 0 },
      activeUsers: { dau, wau, mau },
      signups: { total: signupsPeriod, today: signupsToday },
      orders: { count: totals.purchases, revenueInr: totals.revenueInr, today: { count: ordersToday, revenueInr: revenueToday } },
    },
    daily,
    funnel: {
      courseViews: totals.courseViews,
      checkoutStarted: totals.checkouts,
      ordersPaid: totals.purchases,
      conversionPct: totals.courseViews > 0 ? Math.round((totals.purchases / totals.courseViews) * 1000) / 10 : 0,
    },
    peakHours,
    topViewed,
    topPurchased,
    topSearches,
  });
});

async function fillCourseTitles(rows, ...extraFields) {
  if (rows.length === 0) return [];
  const courses = await Course.find({ _id: { $in: rows.map((row) => row._id) } }).select('title slug').lean();
  const byId = new Map(courses.map((course) => [String(course._id), course]));
  return rows
    .map((row) => {
      const course = byId.get(String(row._id));
      if (!course) return null; // course deleted since — drop the row
      const entry = { id: String(course._id), slug: course.slug, title: course.title, count: row.count };
      for (const field of extraFields) if (row[field] !== undefined) entry[field] = row[field];
      return entry;
    })
    .filter(Boolean);
}
