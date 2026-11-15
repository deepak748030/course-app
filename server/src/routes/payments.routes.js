import { Router } from 'express';
import { z } from 'zod';
import {
  createRazorpayOrder,
  createRazorpayPaymentLink,
  paymentLinkStatus,
  verifyRazorpayPayment,
} from '../controllers/payments.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });
const pollLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

const orderIdParam = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid order id'),
});

const createSchema = z.object({
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course id'),
  couponCode: z.string().trim().toUpperCase().max(24).optional(),
});

const verifySchema = z.object({
  razorpay_order_id: z.string().min(3).max(64),
  razorpay_payment_id: z.string().min(3).max(64),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

router.post('/razorpay/order', paymentLimiter, validateBody(createSchema), createRazorpayOrder);
router.post('/razorpay/verify', paymentLimiter, validateBody(verifySchema), verifyRazorpayPayment);
router.post('/razorpay/link', paymentLimiter, validateBody(createSchema), createRazorpayPaymentLink);
router.get('/razorpay/link/:orderId', pollLimiter, validateParams(orderIdParam), paymentLinkStatus);

export default router;
