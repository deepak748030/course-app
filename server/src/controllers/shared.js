import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Review } from '../models/Review.js';

/** Recompute a course's denormalised rating from its visible reviews. */
export async function recomputeCourseRating(courseId) {
  const [agg] = await Review.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(String(courseId)), visible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Course.updateOne(
    { _id: courseId },
    {
      rating: agg ? Math.round(agg.avg * 10) / 10 : 0,
      reviewCount: agg ? agg.count : 0,
    }
  );
}

/** Idempotently grant access to a course (called when an order is paid). */
export async function grantEnrollment(userId, courseId) {
  return Enrollment.findOneAndUpdate(
    { user: userId, course: courseId },
    { $setOnInsert: { user: userId, course: courseId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
