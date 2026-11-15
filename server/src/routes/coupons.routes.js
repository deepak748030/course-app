import { Router } from 'express';
import { z } from 'zod';
import { listAvailableCoupons, validateCoupon } from '../controllers/coupons.controller.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
const couponValidateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const validateSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(24),
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course id'),
});

router.get('/available', listAvailableCoupons);
router.post('/validate', couponValidateLimiter, validateBody(validateSchema), validateCoupon);

export default router;
