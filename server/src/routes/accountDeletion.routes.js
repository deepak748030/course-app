import { Router } from 'express';
import { z } from 'zod';
import { createDeletionRequest } from '../controllers/accountDeletion.controller.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { isIndianMobile, normalizeIndianPhone } from '../utils/phone.js';

const router = Router();

// A person sends this once; a handful per hour per network is plenty and keeps the queue clean.
const requestLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

const deletionRequestSchema = z.object({
  phone: z
    .string({ required_error: 'Enter the mobile number you sign in with.' })
    .trim()
    .max(20)
    .transform(normalizeIndianPhone)
    .refine(isIndianMobile, 'Enter the 10-digit Indian mobile number you sign in with.'),
  name: z.string().trim().max(80).default(''),
  reason: z.string().trim().max(80).default(''),
  details: z.string().trim().max(1000).default(''),
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm that you understand the deletion is permanent.' }),
  }),
  /** Honeypot — hidden on the form, so only bots fill it in. */
  company: z.string().max(200).optional(),
});

/** POST /api/account-deletion — public request form on the website (/delete-account). */
router.post('/', requestLimiter, validateBody(deletionRequestSchema), createDeletionRequest);

export default router;
