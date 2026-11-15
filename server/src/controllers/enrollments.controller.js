import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { HttpError, asyncHandler } from '../utils/http.js';

/**
 * GET /api/enrollments/my — everything the learner owns, in one call:
 * enrollment state + lesson progress + a snapshot of each course. The app hydrates
 * its learning state from this instead of device-only storage.
 */
export const myEnrollments = asyncHandler(async (req, res) => {
  // The app reads the course's slug, title and price, and the progress fields. Nothing else is sent.
  const enrollments = await Enrollment.find({ user: req.user._id })
    .select('course completedLessons lastLessonId lastPositionSeconds createdAt')
    .populate('course', 'slug title priceInr')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ enrollments });
});

/**
 * PATCH /api/enrollments/:courseId/progress — the app pushes lesson progress as it
 * happens (completed lesson ids + resume position). Idempotent upsert.
 */
export const saveProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { completedLessons, lastLessonId, lastPositionSeconds } = req.body;

  const course = await Course.findById(courseId).select('lessons._id').lean();
  if (!course) throw new HttpError(404, 'Course not found');

  const validLessonIds = new Set((course.lessons || []).map((l) => String(l._id)));
  const cleanCompleted = Array.from(new Set(completedLessons.filter((id) => validLessonIds.has(id))));
  const cleanLastLesson = lastLessonId && validLessonIds.has(lastLessonId) ? lastLessonId : '';

  const enrollment = await Enrollment.findOneAndUpdate(
    { user: req.user._id, course: courseId },
    {
      $set: {
        completedLessons: cleanCompleted,
        lastLessonId: cleanLastLesson,
        lastPositionSeconds,
      },
    },
    { new: true }
  );
  if (!enrollment) throw new HttpError(404, 'You are not enrolled in this course');

  res.json({ enrollment });
});
