import { Coupon } from '../models/Coupon.js';
import { Course } from '../models/Course.js';
import { HttpError, asyncHandler } from '../utils/http.js';

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
