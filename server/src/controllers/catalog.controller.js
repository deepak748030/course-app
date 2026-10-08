import { Category } from '../models/Category.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { asyncHandler } from '../utils/http.js';
import { HttpError } from '../utils/http.js';

/** GET /api/categories */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, label: 1 });
  res.json({ categories });
});

/** GET /api/courses — the app's catalog; only published courses are public. */
export const listCourses = asyncHandler(async (req, res) => {
  const { category, level, q, popular, beginner, limit } = req.validatedQuery;

  const filter = { published: true };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (popular === 'true') filter.isPopular = true;
  if (beginner === 'true') filter.isBeginnerPick = true;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { promise: rx }, { description: rx }];
  }

  const courses = await Course.find(filter)
    .populate('category', 'slug label icon')
    .sort({ isPopular: -1, rating: -1, createdAt: -1 })
    .limit(limit);

  res.json({ courses });
});

/** GET /api/courses/:idOrSlug — accepts either the Mongo id or the slug. */
export const getCourse = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const filter = { published: true };
  if (/^[a-f\d]{24}$/i.test(idOrSlug)) filter._id = idOrSlug;
  else filter.slug = idOrSlug.toLowerCase();

  const course = await Course.findOne(filter).populate('category', 'slug label icon');
  if (!course) throw new HttpError(404, 'Course not found');

  const [enrollments] = await Enrollment.aggregate([
    { $match: { course: course._id } },
    { $count: 'count' },
  ]);

  res.json({ course: { ...course.toJSON(), enrollmentCount: enrollments?.count || 0 } });
});
