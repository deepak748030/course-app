import { Enrollment } from '../models/Enrollment.js';
import { HttpError, asyncHandler } from '../utils/http.js';

/**
 * GET /api/enrollments/my — everything the learner owns, in one call:
 * enrollment state + lesson progress + a snapshot of each course. The app hydrates
 * its learning state from this instead of device-only storage.
 */
export const myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ user: req.user._id })
    .populate('course', 'slug title promise coverUrl category level priceInr lessons')
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

  const enrollment = await Enrollment.findOneAndUpdate(
    { user: req.user._id, course: courseId },
    { $set: { completedLessons, lastLessonId, lastPositionSeconds } },
    { new: true }
  );
  if (!enrollment) throw new HttpError(404, 'You are not enrolled in this course');

  res.json({ enrollment });
});
