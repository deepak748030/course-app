import { Router } from 'express';
import { z } from 'zod';
import { trackEvents } from '../controllers/analytics.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const eventSchema = z.object({
  event: z.string().min(1).max(40),
  /** Mongo ObjectId of the course, when the event is about one. */
  courseId: z.string().max(64).optional(),
  meta: z.record(z.unknown()).optional(),
  /** Client timestamp (ms). The server honours it only within sane bounds. */
  at: z.number().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

router.post('/events', optionalAuth, validateBody(batchSchema), trackEvents);

export default router;
