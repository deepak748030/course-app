import fsPromises from 'node:fs/promises';
import { Category } from '../models/Category.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { cacheRemember } from '../services/cache.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import {
  PLAYBACK_TTL_SECONDS,
  createVideoPlaybackUrl,
  lessonVideos,
  pickLessonVideo,
  resolveVideoFilePath,
  verifyVideoPlaybackSignature,
  videoFileExists,
  videoMimeType,
} from '../services/videoStorage.js';

/** GET /api/categories */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await cacheRemember('catalog:categories', 5 * 60_000, () =>
    Category.find().sort({ sortOrder: 1, label: 1 }).lean()
  );
  res.json({ categories });
});

/**
 * Fields the public catalog sends. `lessons.videos` is resolved into `lesson.videoKey` inside
 * `withDerived` so `hasCourseVideo` is always accurate while keeping the wire payload compact.
 */
const PUBLIC_COURSE_FIELDS = '-createdAt -updatedAt -__v';

/** Attach derived lesson/hour counts and ensure `videoKey` is populated from `videos` when needed. */
function withDerived(course) {
  const rawLessons = course.lessons || [];
  const lessons = rawLessons.map((l) => {
    const primaryKey = l.videoKey || pickLessonVideo(l)?.key || '';
    const { videos: _videos, ...rest } = l;
    return { ...rest, videoKey: primaryKey };
  });
  const lessonCount = lessons.length;
  const totalMinutes = lessons.reduce((sum, l) => sum + (l.minutes || 0), 0);
  return { ...course, lessons, lessonCount, totalMinutes, hours: Math.round((totalMinutes / 60) * 10) / 10 };
}

/**
 * GET /api/courses — the app's catalog. Only published courses, index-backed & L1/Redis cached:
 *   - `q` runs through the $text index (title/promise/description, weighted)
 *   - lists are lean + projected, so the wire stays small and Mongoose skips hydrating
 */
export const listCourses = asyncHandler(async (req, res) => {
  const { category, level, q, popular, beginner, limit } = req.validatedQuery;
  const cacheKey = `catalog:courses:${category || ''}:${level || ''}:${q || ''}:${popular || ''}:${beginner || ''}:${limit || ''}`;

  const courses = await cacheRemember(cacheKey, 2 * 60_000, async () => {
    const filter = { published: true };
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (popular === 'true') filter.isPopular = true;
    if (beginner === 'true') filter.isBeginnerPick = true;
    if (q) filter.$text = { $search: q };

    const rows = await Course.find(filter)
      .select(PUBLIC_COURSE_FIELDS)
      .populate('category', 'slug label icon')
      .sort(q ? { score: { $meta: 'textScore' } } : { isPopular: -1, rating: -1 })
      .limit(limit)
      .lean();

    return rows.map(withDerived);
  });

  res.json({ courses });
});

/** GET /api/courses/:idOrSlug — accepts either the Mongo id or the slug. */
export const getCourse = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const key = `catalog:course:${String(idOrSlug).toLowerCase()}`;

  const course = await cacheRemember(key, 60_000, async () => {
    const filter = { published: true };
    if (/^[a-f\d]{24}$/i.test(idOrSlug)) filter._id = idOrSlug;
    else filter.slug = idOrSlug.toLowerCase();

    const doc = await Course.findOne(filter)
      .select(PUBLIC_COURSE_FIELDS)
      .populate('category', 'slug label icon')
      .lean();
    if (!doc) return null;

    const enrollmentCount = await Enrollment.countDocuments({ course: doc._id });
    return { ...withDerived(doc), enrollmentCount };
  });

  if (!course) throw new HttpError(404, 'Course not found');
  res.json({ course });
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

  const course = await cacheRemember(`catalog:course-videos:${courseId}`, 2 * 60_000, () =>
    Course.findOne({ _id: courseId, published: true }).select('lessons').lean()
  );
  if (!course) throw new HttpError(404, 'Course not found');
  const lesson = course.lessons.find((l) => String(l._id) === lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found');
  const videos = lessonVideos(lesson);
  if (!videos.length) throw new HttpError(404, 'This lesson has no course video');

  if (!lesson.isPreview) {
    const owned = await cacheRemember(`enrollment:owns:${req.user._id}:${course._id}`, 2 * 60_000, async () =>
      Boolean(await Enrollment.exists({ user: req.user._id, course: course._id }))
    );
    if (!owned) throw new HttpError(403, 'Buy this course to watch this lesson');
  }

  // ?quality=720 picks that version (or the closest lower one); without it the best available plays.
  const chosen = pickLessonVideo(lesson, typeof req.query.quality === 'string' ? req.query.quality : '');
  if (!(await videoFileExists(chosen.key))) {
    throw new HttpError(404, 'Video file is missing from server uploads');
  }
  const url = createVideoPlaybackUrl(chosen.key);
  res.json({
    url,
    expiresIn: PLAYBACK_TTL_SECONDS,
    quality: chosen.quality,
    qualities: videos.map((v) => v.quality),
  });
});

/**
 * GET /api/videos/stream?key=...&exp=...&sig=...
 * Serves a course video directly from the server's `uploads/videos/` folder with HTTP Range
 * (206 Partial Content) support after validating the HMAC signature issued by `lessonVideoUrl`.
 */
export const streamLessonVideo = asyncHandler(async (req, res) => {
  const { key, exp, sig } = req.query;
  if (typeof key !== 'string' || !verifyVideoPlaybackSignature(key, exp, sig)) {
    throw new HttpError(403, 'This video playback link is invalid or has expired');
  }
  const absPath = resolveVideoFilePath(key);
  if (!absPath) throw new HttpError(404, 'Video not found');

  let stat;
  try {
    stat = await fsPromises.stat(absPath);
  } catch {
    throw new HttpError(404, 'Video not found');
  }
  if (!stat.isFile()) throw new HttpError(404, 'Video not found');

  res.setHeader('Content-Type', videoMimeType(key));
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600, no-transform');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(absPath, { dotfiles: 'deny' });
});

/**
 * GET /api/courses/:idOrSlug/related — recommendation rail on the course page.
 * Primary signal: co-purchase ("learners who bought this also bought…") straight
 * from paid orders. Fallback when there is no purchase history yet: the
 * highest-rated popular courses in the same category, then overall.
 */
export const relatedCourses = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const cacheKey = `catalog:related:${String(idOrSlug).toLowerCase()}`;

  const courses = await cacheRemember(cacheKey, 5 * 60_000, async () => {
    const filter = { published: true };
    if (/^[a-f\d]{24}$/i.test(idOrSlug)) filter._id = idOrSlug;
    else filter.slug = idOrSlug.toLowerCase();

    const course = await Course.findOne(filter).select('category').lean();
    if (!course) return null;

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
        .select(PUBLIC_COURSE_FIELDS)
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
          .select(PUBLIC_COURSE_FIELDS)
          .populate('category', 'slug label icon')
          .sort({ isPopular: -1, rating: -1 })
          .lean();
      // Same track first, then the best of the rest.
      let fill = course.category ? await baseQuery().where('category').equals(course.category).limit(3 - related.length) : [];
      if (fill.length < 3 - related.length) {
        const rest = await baseQuery().limit(3 - related.length);
        const seen = new Set(fill.map((c) => String(c._id)));
        fill = [...fill, ...rest.filter((c) => !seen.has(String(c._id)))].slice(0, 3 - related.length);
      }
      related = [...related, ...fill];
    }

    return related.map(withDerived);
  });

  if (!courses) throw new HttpError(404, 'Course not found');
  res.json({ courses });
});
