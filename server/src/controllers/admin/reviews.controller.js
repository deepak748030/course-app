import { Review } from '../../models/Review.js';
import { HttpError, asyncHandler } from '../../utils/http.js';
import { recomputeCourseRating } from '../shared.js';

/** GET /api/admin/reviews — moderation queue with course + user context. */
export const listReviews = asyncHandler(async (req, res) => {
  const { visible } = req.validatedQuery;
  const filter = {};
  if (visible === 'true') filter.visible = true;
  if (visible === 'false') filter.visible = false;

  const reviews = await Review.find(filter)
    .sort({ createdAt: -1 })
    .limit(300)
    .populate('course', 'title slug')
    .populate('user', 'name email')
    .lean();

  res.json({ reviews });
});

/** PATCH /api/admin/reviews/:id — show/hide. Hidden reviews drop out of the rating. */
export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!review) throw new HttpError(404, 'Review not found');
  await recomputeCourseRating(review.course);
  res.json({ review });
});

/** DELETE /api/admin/reviews/:id */
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new HttpError(404, 'Review not found');
  await recomputeCourseRating(review.course);
  res.json({ ok: true });
});
