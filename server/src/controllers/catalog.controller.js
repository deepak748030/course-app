import { Category } from '../models/Category.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { PLAYBACK_TTL_SECONDS, createVideoPlaybackUrl, lessonVideos, pickLessonVideo } from '../services/videoStorage.js';

/** GET /api/categories */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, label: 1 }).lean();
  res.json({ categories });
});

/** Attach the derived lesson/hour counts a lean document does not carry. */
function withDerived(course) {
  const lessonCount = course.lessons.length;
  const totalMinutes = course.lessons.reduce((sum, l) => sum + l.minutes, 0);
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

/**
 * GET /api/courses/:courseId/lessons/:lessonId/video — signed, short-lived link to a lesson video.
 * Only enrolled learners get it; free-preview lessons are open to any signed-in learner.
 */
export const lessonVideoUrl = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;
  if (!/^[a-f\d]{24}$/i.test(courseId) || !/^[a-f\d]{24}$/i.test(lessonId)) {
    throw new HttpError(404, 'Lesson not found');
  }

  const course = await Course.findOne({ _id: courseId, published: true }).select('lessons').lean();
  if (!course) throw new HttpError(404, 'Course not found');
  const lesson = course.lessons.find((l) => String(l._id) === lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found');
  const videos = lessonVideos(lesson);
  if (!videos.length) throw new HttpError(404, 'This lesson has no course video');

  if (!lesson.isPreview) {
    const owned = await Enrollment.exists({ user: req.user._id, course: course._id });
    if (!owned) throw new HttpError(403, 'Buy this course to watch this lesson');
  }

  // ?quality=720 picks that version (or the closest lower one); without it the best available plays.
  const chosen = pickLessonVideo(lesson, typeof req.query.quality === 'string' ? req.query.quality : '');
  const url = await createVideoPlaybackUrl(chosen.key);
  res.json({
    url,
    expiresIn: PLAYBACK_TTL_SECONDS,
    quality: chosen.quality,
    qualities: videos.map((v) => v.quality),
  });
});

/**
 * GET /api/courses/:idOrSlug/related — recommendation rail on the course page.
 * Primary signal: co-purchase ("learners who bought this also bought…") straight
 * from paid orders. Fallback when there is no purchase history yet: the
 * highest-rated popular courses in the same category, then overall.
 */
export const relatedCourses = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const filter = { published: true };
  if (/^[a-f\d]{24}$/i.test(idOrSlug)) filter._id = idOrSlug;
  else filter.slug = idOrSlug.toLowerCase();

  const course = await Course.findOne(filter).lean();
  if (!course) throw new HttpError(404, 'Course not found');

  // Co-purchase: other courses bought by the same learners, most-shared first.
  const coBought = await Enrollment.aggregate([
    { $match: { course: course._id } },
    { $group: { _id: '$user' } },
    {
      $lookup: {
        from: 'enrollments',
        localField: '_id',
        foreignField: 'user',
        as: 'others',
      },
    },
    { $unwind: '$others' },
    { $match: { 'others.course': { $ne: course._id } } },
    { $group: { _id: '$others.course', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 6 },
  ]);

  let related = [];
  if (coBought.length) {
    related = await Course.find({ _id: { $in: coBought.map((c) => c._id) }, published: true })
      .select('-createdAt -updatedAt -__v')
      .populate('category', 'slug label icon')
      .lean();
    // keep the co-purchase ranking
    const order = new Map(coBought.map((c, i) => [String(c._id), i]));
    related.sort((a, b) => (order.get(String(a._id)) ?? 99) - (order.get(String(b._id)) ?? 99));
  }

  if (related.length < 3) {
    const exclude = [...related.map((c) => c._id), course._id];
    const baseQuery = () =>
      Course.find({ published: true, _id: { $nin: exclude } })
        .select('-createdAt -updatedAt -__v')
        .populate('category', 'slug label icon')
        .sort({ isPopular: -1, rating: -1 })
        .lean();
    // Same track first, then the best of the rest.
    let fill = course.category ? await baseQuery().where('category').equals(course.category).limit(3 - related.length) : [];
    if (fill.length < 3 - related.length) {
      const rest = await baseQuery().limit(3 - related.length - fill.length + fill.length);
      const seen = new Set(fill.map((c) => String(c._id)));
      fill = [...fill, ...rest.filter((c) => !seen.has(String(c._id)))].slice(0, 3 - related.length);
    }
    related = [...related, ...fill];
  }

  res.json({ courses: related.map(withDerived) });
});
