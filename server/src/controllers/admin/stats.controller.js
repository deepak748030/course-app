import { Category } from '../../models/Category.js';
import { Course } from '../../models/Course.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Order } from '../../models/Order.js';
import { Review } from '../../models/Review.js';
import { User } from '../../models/User.js';
import { asyncHandler } from '../../utils/http.js';

const DAY = 24 * 60 * 60 * 1000;

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

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

function sumBetween(orders, from, to) {
  return orders
    .filter((o) => o.createdAt >= from && o.createdAt < to)
    .reduce((sum, o) => sum + o.amountInr, 0);
}

/**
 * GET /api/admin/stats/overview — everything the dashboard home page renders:
 * KPI cards with deltas, the revenue/enrollment time series, top courses, rating
 * distribution, category breakdown and the two "recent" tables.
 */
export const overview = asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const d30 = new Date(startOfToday.getTime() - 30 * DAY);
  const d60 = new Date(startOfToday.getTime() - 60 * DAY);
  const d14 = new Date(startOfToday.getTime() - 14 * DAY);

  const [orders, users, courses, categories, enrollments, ratingDist, userCount] = await Promise.all([
    Order.find({ status: 'paid', createdAt: { $gte: d60 } }).select('amountInr createdAt course').lean(),
    User.find({ createdAt: { $gte: d60 } }).select('createdAt').lean(),
    Course.find().select('title coverUrl rating reviewCount priceInr published category').populate('category', 'label').lean(),
    Category.find().lean(),
    Enrollment.find({ createdAt: { $gte: d60 } }).select('createdAt course').lean(),
    Review.aggregate([
      { $match: { visible: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    User.countDocuments(),
  ]);

  // ---- KPI cards: last 30 days vs the 30 before --------------------------------
  const revenue30 = sumBetween(orders, d30, new Date(startOfToday.getTime() + DAY));
  const revenuePrev30 = sumBetween(orders, d60, d30);
  const orders30 = orders.filter((o) => o.createdAt >= d30).length;
  const ordersPrev30 = orders.length - orders30;
  const newUsers30 = users.filter((u) => u.createdAt >= d30).length;
  const newUsersPrev30 = users.length - newUsers30;
  const enrollments30 = enrollments.filter((e) => e.createdAt >= d30).length;
  const enrollmentsPrev30 = enrollments.length - enrollments30;

  const pct = (current, previous) =>
    previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

  // ---- Revenue series (30 days) -------------------------------------------------
  const revenueByDay = new Map();
  const ordersByDay = new Map();
  for (const order of orders) {
    const key = dayKey(order.createdAt);
    revenueByDay.set(key, (revenueByDay.get(key) || 0) + order.amountInr);
    ordersByDay.set(key, (ordersByDay.get(key) || 0) + 1);
  }
  const revenueSeries = lastNDays(30).map((d) => ({
    date: d.label,
    revenue: revenueByDay.get(d.key) || 0,
    orders: ordersByDay.get(d.key) || 0,
  }));

  // ---- Enrollments per day (14 days) --------------------------------------------
  const enrollByDay = new Map();
  for (const enrollment of enrollments) {
    const key = dayKey(enrollment.createdAt);
    enrollByDay.set(key, (enrollByDay.get(key) || 0) + 1);
  }
  const enrollmentSeries = lastNDays(14).map((d) => ({
    date: d.label,
    enrollments: enrollByDay.get(d.key) || 0,
  }));

  // ---- Top courses by paid revenue ------------------------------------------------
  const enrollmentCounts = new Map();
  for (const enrollment of enrollments) {
    const id = String(enrollment.course);
    enrollmentCounts.set(id, (enrollmentCounts.get(id) || 0) + 1);
  }
  const revenueByCourse = new Map();
  for (const order of orders) {
    if (order.createdAt < d30) continue;
    const id = String(order.course);
    revenueByCourse.set(id, (revenueByCourse.get(id) || 0) + order.amountInr);
  }
  const topCourses = courses
    .map((course) => ({
      id: String(course._id),
      title: course.title,
      coverUrl: course.coverUrl,
      rating: course.rating,
      priceInr: course.priceInr,
      published: course.published,
      enrollments30: enrollmentCounts.get(String(course._id)) || 0,
      revenue30: revenueByCourse.get(String(course._id)) || 0,
    }))
    .sort((a, b) => b.revenue30 - a.revenue30)
    .slice(0, 6);

  // ---- Rating distribution --------------------------------------------------------
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratingDist.find((r) => r._id === stars)?.count || 0,
  }));

  // ---- Category breakdown -----------------------------------------------------------
  const courseCountByCategory = new Map();
  const courseIdsByCategory = new Map();
  for (const course of courses) {
    const id = String(course.category?._id);
    courseCountByCategory.set(id, (courseCountByCategory.get(id) || 0) + 1);
    if (!courseIdsByCategory.has(id)) courseIdsByCategory.set(id, new Set());
    courseIdsByCategory.get(id).add(String(course._id));
  }
  const categoryBreakdown = categories
    .map((category) => {
      const ids = courseIdsByCategory.get(String(category._id)) || new Set();
      let enrollmentTotal = 0;
      for (const enrollment of enrollments) {
        if (ids.has(String(enrollment.course))) enrollmentTotal += 1;
      }
      return {
        label: category.label,
        courses: courseCountByCategory.get(String(category._id)) || 0,
        enrollments30: enrollmentTotal,
      };
    })
    .sort((a, b) => b.enrollments30 - a.enrollments30);

  // ---- Recent activity ---------------------------------------------------------------
  const [recentOrders, recentUsers] = await Promise.all([
    Order.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('user', 'name email')
      .lean(),
    User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(6).select('name email createdAt').lean(),
  ]);

  const avgRating =
    courses.filter((c) => c.reviewCount > 0).reduce((sum, c) => sum + c.rating, 0) /
    Math.max(1, courses.filter((c) => c.reviewCount > 0).length);

  res.json({
    kpis: {
      revenue30,
      revenueDelta: pct(revenue30, revenuePrev30),
      orders30,
      ordersDelta: pct(orders30, ordersPrev30),
      newUsers30,
      newUsersDelta: pct(newUsers30, newUsersPrev30),
      enrollments30,
      enrollmentsDelta: pct(enrollments30, enrollmentsPrev30),
      totalUsers: userCount,
      totalCourses: courses.length,
      publishedCourses: courses.filter((c) => c.published).length,
      avgRating: Math.round(avgRating * 10) / 10,
    },
    revenueSeries,
    enrollmentSeries,
    topCourses,
    ratingDistribution,
    categoryBreakdown,
    recentOrders: recentOrders.map((o) => ({
      id: String(o._id),
      courseTitle: o.courseTitle,
      user: o.user ? { name: o.user.name, email: o.user.email } : null,
      amountInr: o.amountInr,
      status: o.status,
      createdAt: o.createdAt,
    })),
    recentUsers,
  });
});
