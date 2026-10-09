import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Review } from '../models/Review.js';
import { emitToAdmins } from '../realtime/socket.js';
import { HttpError, asyncHandler } from '../utils/http.js';
import { recomputeCourseRating } from './shared.js';

/** POST /api/courses/:courseId/reviews — only enrolled learners can review. */
export const createOrUpdateReview = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { rating, body } = req.body;

  const course = await Course.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');

  const enrolled = await Enrollment.exists({ user: req.user._id, course: course._id });
  if (!enrolled) throw new HttpError(403, 'You can review a course only after enrolling');

  const review = await Review.findOneAndUpdate(
    { course: course._id, user: req.user._id },
    { rating, body: body || '', author: req.user.name, visible: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await recomputeCourseRating(course._id);
  emitToAdmins('review.created', { courseTitle: course.title, author: req.user.name, rating });
  res.status(201).json({ review });
});

/** GET /api/courses/:courseId/reviews — visible reviews for the course page. */
export const listCourseReviews = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const reviews = await Review.find({ course: courseId, visible: true }).sort({ createdAt: -1 }).limit(50);
  res.json({ reviews });
});
