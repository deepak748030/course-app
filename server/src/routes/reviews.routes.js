import { Router } from 'express';
import { z } from 'zod';
import { createOrUpdateReview, listCourseReviews } from '../controllers/reviews.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = Router();

const courseParam = z.object({ courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course id') });

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
});

router.get('/courses/:courseId/reviews', validateParams(courseParam), listCourseReviews);
router.post(
  '/courses/:courseId/reviews',
  requireAuth,
  validateParams(courseParam),
  validateBody(reviewSchema),
  createOrUpdateReview
);

export default router;
