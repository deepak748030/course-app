import { Category } from '../models/Category.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { asyncHandler, HttpError } from '../utils/http.js';

/** GET /api/categories */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, label: 1 }).lean();
  res.json({ categories });
});

/** Attach the derived lesson/hour counts a lean document does not carry. */
function withDerived(course) {
  const lessonCount = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const totalMinutes = course.sections.reduce(
    (sum, s) => sum + s.lessons.reduce((m, l) => m + l.minutes, 0),
    0
  );
  return { ...course, lessonCount, totalMinutes, hours: Math.round((totalMinutes / 60) * 10) / 10 };
}

/**
 * GET /api/courses — the app's catalog. Only published courses, index-backed:
 *   - `q` runs through the $text index (title/promise/description, weighted)
 *   - lists are lean + projected, so the wire stays small and Mongoose skips hydrating
 */
export const listCourses = asyncHandler(async (req, res) => {
  const { category, level, q, popular, beginner, limit } = req.validatedQuery;

  const filter = { published: true };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (popular === 'true') filter.isPopular = true;
  if (beginner === 'true') filter.isBeginnerPick = true;
  if (q) filter.$text = { $search: q };

  const courses = await Course.find(filter)
    .select('-createdAt -updatedAt -__v')
    .populate('category', 'slug label icon')
    .sort(q ? { score: { $meta: 'textScore' } } : { isPopular: -1, rating: -1 })
    .limit(limit)
    .lean();

  res.json({ courses: courses.map(withDerived) });
});

/** GET /api/courses/:idOrSlug — accepts either the Mongo id or the slug. */
export const getCourse = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const filter = { published: true };
  if (/^[a-f\d]{24}$/i.test(idOrSlug)) filter._id = idOrSlug;
  else filter.slug = idOrSlug.toLowerCase();

  const course = await Course.findOne(filter).populate('category', 'slug label icon').lean();
  if (!course) throw new HttpError(404, 'Course not found');

  const [enrollments] = await Enrollment.aggregate([
    { $match: { course: course._id } },
    { $count: 'count' },
  ]);

  res.json({
    course: { ...withDerived(course), enrollmentCount: enrollments?.count || 0 },
  });
});
