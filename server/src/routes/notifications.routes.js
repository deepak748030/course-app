import { Router } from 'express';
import { z } from 'zod';
import { listInbox, registerPushToken, unregisterPushToken } from '../controllers/notifications.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);
const pushTokenLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const inboxQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime().optional(),
  since: z.string().datetime().optional(),
});

const tokenBody = z.object({
  token: z.string().trim().min(10).max(200),
  platform: z.enum(['ios', 'android', 'web', 'unknown']).optional(),
});

router.get('/', validateQuery(inboxQuery), listInbox);
router.post('/push-token', pushTokenLimiter, validateBody(tokenBody), registerPushToken);
router.delete('/push-token', pushTokenLimiter, validateBody(tokenBody), unregisterPushToken);

export default router;
