import { Coupon } from '../models/Coupon.js';
import { Course } from '../models/Course.js';
import { HttpError, asyncHandler } from '../utils/http.js';

/** GET /api/coupons/available — the codes checkout can offer: usable right now, newest first. */
export const listAvailableCoupons = asyncHandler(async (_req, res) => {
  const now = new Date();
  const candidates = await Coupon.find({
    active: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
  })
    .sort({ createdAt: -1 })
    .limit(50);
  const coupons = candidates
    .filter((coupon) => coupon.isUsable(now))
    .slice(0, 10)
    .map((coupon) => ({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      expiresAt: coupon.expiresAt ?? null,
    }));
  res.json({ coupons });
});

/** POST /api/coupons/validate — checkout checks a code before showing the discounted total. */
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, courseId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon || !coupon.isUsable()) throw new HttpError(404, 'This coupon is not valid');

  const discountInr = coupon.discountFor(course.priceInr);
  res.json({
    coupon: { code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description },
    discountInr,
    finalPriceInr: course.priceInr - discountInr,
  });
});
