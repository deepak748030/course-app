import mongoose from 'mongoose';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Notification } from '../models/Notification.js';
import { Order } from '../models/Order.js';
import { OtpCode } from '../models/OtpCode.js';
import { PushToken } from '../models/PushToken.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { deleteAvatarImage } from '../services/uploads.js';

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

/**
 * Deletes a profile photo from storage, unless another account points at the same image.
 * Never throws: clean-up must not fail the request that triggered it.
 */
export async function releaseAvatar(url, ownerId) {
  if (!url) return;
  try {
    if (await User.exists({ avatarUrl: url, _id: { $ne: ownerId } })) return;
    await deleteAvatarImage(url);
  } catch (err) {
    console.warn('[uploads] could not delete a profile photo:', err.message);
  }
}

/**
 * Everything that goes with a deleted account — the learner's own delete (DELETE /api/users/me)
 * and the admin's (DELETE /api/admin/users/:id) share this one list, and the privacy policy and the
 * /legal/delete-account page describe it, so change them together:
 *
 *   deleted     orders, enrollments (course access and progress), reviews, push tokens, inbox
 *               messages sent to this user alone, any live sign-in code, the profile photo file
 *   de-linked   analytics events lose the user id, so the dashboard's counts survive but nothing
 *               ties them to the person any more; they expire on their own TTL (~13 months)
 *
 * The caller deletes the user document itself.
 */
export async function purgeUserData(user) {
  const reviewedCourses = await Review.distinct('course', { user: user._id });
  await Promise.all([
    Order.deleteMany({ user: user._id }),
    Enrollment.deleteMany({ user: user._id }),
    Review.deleteMany({ user: user._id }),
    PushToken.deleteMany({ user: user._id }),
    Notification.deleteMany({ audience: 'user', user: user._id }),
    AnalyticsEvent.updateMany({ user: user._id }, { $set: { user: null } }),
    user.phone ? OtpCode.deleteMany({ phone: user.phone }) : Promise.resolve(),
  ]);
  // Their reviews no longer count toward those courses' ratings.
  await Promise.all(reviewedCourses.map((courseId) => recomputeCourseRating(courseId)));
  await releaseAvatar(user.avatarUrl, user._id);
}
