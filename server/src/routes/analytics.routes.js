import { Router } from 'express';
import { z } from 'zod';
import { trackEvents } from '../controllers/analytics.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
const analyticsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 180 });

const safeMetaValue = z.union([z.string().max(200), z.number().finite(), z.boolean()]);
const safeMeta = z
  .record(z.string().max(40), safeMetaValue)
  .transform((obj) => {
    const clean = {};
    let count = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (!k || k.startsWith('$') || k.includes('.')) continue;
      clean[k] = v;
      count += 1;
      if (count >= 10) break;
    }
    return clean;
  })
  .optional();

const eventSchema = z.object({
  event: z.string().min(1).max(40),
  /** Mongo ObjectId of the course, when the event is about one. */
  courseId: z.string().max(64).optional(),
  meta: safeMeta,
  /** Client timestamp (ms). The server honours it only within sane bounds. */
  at: z.number().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

router.post('/events', analyticsLimiter, optionalAuth, validateBody(batchSchema), trackEvents);

export default router;
