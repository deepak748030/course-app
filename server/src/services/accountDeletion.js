/**
 * Deleting an account and the data linked to it — one implementation for every path:
 * the learner deleting themselves in the app, an admin processing a web deletion request, and an
 * admin deleting a learner from the Learners page.
 *
 * What happens here is what the public policies promise (server/src/data/defaultContent.js →
 * privacy "How long we keep it" and deletion "What we delete / What we keep"):
 *
 *   deleted     profile, profile photo, enrollments + progress, reviews (course ratings recomputed),
 *               personal notifications, push tokens, unpaid orders, open sign-in codes
 *   de-linked   usage events (user set to null — aggregate stats survive, the person does not)
 *   kept        paid and refunded orders — the tax and accounting record. They keep only the id of an
 *               account that no longer exists, so they no longer point at a person.
 */
import { recomputeCourseRating } from '../controllers/shared.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Notification } from '../models/Notification.js';
import { Order } from '../models/Order.js';
import { OtpCode } from '../models/OtpCode.js';
import { PushToken } from '../models/PushToken.js';
import { Review } from '../models/Review.js';
import { Settings } from '../models/Settings.js';
import { User } from '../models/User.js';
import { deleteStoredImage } from './uploads.js';

/** The profile photo goes too — unless something else (a cover, a banner, another account) uses the same file. */
async function removeAvatar(user) {
  const url = user.avatarUrl;
  if (!url) return;
  const [otherUser, course, banner] = await Promise.all([
    User.exists({ avatarUrl: url, _id: { $ne: user._id } }),
    Course.exists({ coverUrl: url }),
    Settings.exists({ _id: 'app', 'homeBanners.imageUrl': url }),
  ]);
  if (otherUser || course || banner) return;
  await deleteStoredImage(url);
}

/**
 * Removes the account and its data. Related data goes first and the account itself last, so an
 * interrupted run can simply be repeated. Returns counts for the admin's confirmation message.
 */
export async function deleteAccountAndData(user) {
  const userId = user._id;
  const reviewedCourses = await Review.distinct('course', { user: userId });

  const [enrollments, reviews, , , pendingOrders, keptOrders] = await Promise.all([
    Enrollment.deleteMany({ user: userId }),
    Review.deleteMany({ user: userId }),
    PushToken.deleteMany({ user: userId }),
    Notification.deleteMany({ audience: 'user', user: userId }),
    Order.deleteMany({ user: userId, status: 'pending' }),
    Order.countDocuments({ user: userId, status: { $ne: 'pending' } }),
    AnalyticsEvent.updateMany({ user: userId }, { $set: { user: null } }),
    user.phone ? OtpCode.deleteMany({ phone: user.phone }) : Promise.resolve(),
  ]);

  await removeAvatar(user);
  await User.deleteOne({ _id: userId });

  // Ratings are denormalised onto the course, so the courses this learner reviewed are recounted.
  // The account is already gone at this point, so a failed recount is logged, never reported as a
  // failed deletion (the next review on that course recounts it anyway).
  await Promise.all(
    reviewedCourses.map((courseId) =>
      recomputeCourseRating(courseId).catch((error) => {
        console.warn(`[account-deletion] could not recount the rating of course ${courseId}:`, error.message);
      })
    )
  );

  return {
    enrollments: enrollments.deletedCount ?? 0,
    reviews: reviews.deletedCount ?? 0,
    pendingOrders: pendingOrders.deletedCount ?? 0,
    keptOrders,
  };
}
