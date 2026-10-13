import { Router } from 'express';
import { z } from 'zod';
import { login, me, register, requestOtp, verifyOtp } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { isIndianMobile, normalizeIndianPhone } from '../utils/phone.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const otpRequestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const otpVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });

/** Accepts "98765 43210", "+91 98765 43210", "919876543210" or "09876543210". */
const indianMobile = z
  .string()
  .transform(normalizeIndianPhone)
  .refine(isIndianMobile, 'Enter a valid 10-digit Indian mobile number, starting with 6, 7, 8 or 9.');

const otpRequestSchema = z.object({ phone: indianMobile });
const otpVerifySchema = z.object({
  phone: indianMobile,
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
  phone: z.string().trim().max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

router.post('/otp/request', otpRequestLimiter, validateBody(otpRequestSchema), requestOtp);
router.post('/otp/verify', otpVerifyLimiter, validateBody(otpVerifySchema), verifyOtp);
router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.get('/me', requireAuth, me);

export default router;
