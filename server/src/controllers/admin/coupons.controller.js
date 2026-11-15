import { Coupon } from '../../models/Coupon.js';
import { invalidateCache } from '../../services/cache.js';
import { HttpError, asyncHandler } from '../../utils/http.js';

/** GET /api/admin/coupons */
export const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
});

/** POST /api/admin/coupons */
export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  invalidateCache('coupons:');
  res.status(201).json({ coupon });
});

/** PUT /api/admin/coupons/:id */
export const updateCoupon = asyncHandler(async (req, res) => {
  const current = await Coupon.findById(req.params.id);
  if (!current) throw new HttpError(404, 'Coupon not found');
  const nextType = req.body.type ?? current.type;
  const nextValue = req.body.value ?? current.value;
  if (nextType === 'percent' && nextValue > 90) {
    throw new HttpError(400, 'Percentage discount cannot exceed 90%');
  }
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  invalidateCache('coupons:');
  res.json({ coupon });
});

/** DELETE /api/admin/coupons/:id */
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new HttpError(404, 'Coupon not found');
  invalidateCache('coupons:');
  res.json({ ok: true, deleted: coupon.code });
});
