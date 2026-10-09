import { Router } from 'express';
import { z } from 'zod';
import { myEnrollments, saveProgress } from '../controllers/enrollments.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

// Progress is pushed frequently while a lesson plays — generous but bounded.
const progressLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

const courseParam = z.object({ courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course id') });

const progressSchema = z.object({
  completedLessons: z.array(z.string().max(40)).max(500),
  lastLessonId: z.string().max(40).default(''),
  lastPositionSeconds: z.number().min(0).default(0),
});

router.get('/my', myEnrollments);
router.patch('/:courseId/progress', progressLimiter, validateParams(courseParam), validateBody(progressSchema), saveProgress);

export default router;
