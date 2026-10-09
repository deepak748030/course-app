import { Course } from '../../models/Course.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Order } from '../../models/Order.js';
import { Review } from '../../models/Review.js';
import { emitToApp } from '../../realtime/socket.js';
import { HttpError, asyncHandler } from '../../utils/http.js';

const catalogChanged = (reason, courseId) => emitToApp('catalog.changed', { reason, courseId });

/** GET /api/admin/courses — includes enrollment counts for the table. */
export const listCourses = asyncHandler(async (req, res) => {
  const { search, category, published, sort } = req.validatedQuery;

  const filter = {};
  if (category) filter.category = category;
  if (published === 'true') filter.published = true;
  if (published === 'false') filter.published = false;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { slug: rx }, { promise: rx }];
  }

  const courses = await Course.find(filter)
    .populate('category', 'slug label icon')
    .sort(sort === 'price' ? { priceInr: -1 } : sort === 'rating' ? { rating: -1 } : { createdAt: -1 })
    .lean();

  const ids = courses.map((c) => c._id);
  const counts = await Enrollment.aggregate([
    { $match: { course: { $in: ids } } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({
    courses: courses.map((course) => ({ ...course, enrollmentCount: countById.get(String(course._id)) || 0 })),
  });
});

/** GET /api/admin/courses/:id */
export const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate('category', 'slug label icon');
  if (!course) throw new HttpError(404, 'Course not found');
  res.json({ course });
});

/** POST /api/admin/courses */
export const createCourse = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body.slug) {
    body.slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  const course = await Course.create(body);
  catalogChanged('created', String(course._id));
  res.status(201).json({ course });
});

/** PUT /api/admin/courses/:id */
export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!course) throw new HttpError(404, 'Course not found');
  catalogChanged('updated', String(course._id));
  res.json({ course });
});

/** PATCH /api/admin/courses/:id/publish — quick publish/unpublish toggle. */
export const setPublished = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { published: req.body.published },
    { new: true }
  );
  if (!course) throw new HttpError(404, 'Course not found');
  catalogChanged(req.body.published ? 'published' : 'unpublished', String(course._id));
  res.json({ course });
});

/** DELETE /api/admin/courses/:id — cascades reviews and enrollments; orders keep their snapshot. */
export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) throw new HttpError(404, 'Course not found');
  await Promise.all([
    Review.deleteMany({ course: course._id }),
    Enrollment.deleteMany({ course: course._id }),
    Order.updateMany({ course: course._id }, { $set: { course: null } }),
  ]);
  catalogChanged('deleted', String(course._id));
  res.json({ ok: true, deleted: course.title });
});
