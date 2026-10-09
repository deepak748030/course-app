import { Router } from 'express';
import { z } from 'zod';
import {
  createRazorpayOrder,
  createRazorpayPaymentLink,
  paymentLinkStatus,
  verifyRazorpayPayment,
} from '../controllers/payments.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course id'),
  couponCode: z.string().trim().toUpperCase().max(24).optional(),
});

const verifySchema = z.object({
  razorpay_order_id: z.string().min(3).max(64),
  razorpay_payment_id: z.string().min(3).max(64),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

router.post('/razorpay/order', validateBody(createSchema), createRazorpayOrder);
router.post('/razorpay/verify', validateBody(verifySchema), verifyRazorpayPayment);
router.post('/razorpay/link', validateBody(createSchema), createRazorpayPaymentLink);
router.get('/razorpay/link/:orderId', paymentLinkStatus);

export default router;
