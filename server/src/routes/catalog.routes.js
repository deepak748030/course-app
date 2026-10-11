import { Router } from 'express';
import { z } from 'zod';
import { getCourse, lessonVideoUrl, listCategories, listCourses, relatedCourses } from '../controllers/catalog.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateParams, validateQuery } from '../middleware/validate.js';

const router = Router();

const courseListQuery = z.object({
  category: z.string().optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  q: z.string().max(100).optional(),
  popular: z.enum(['true', 'false']).optional(),
  beginner: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

const idOrSlugParam = z.object({ idOrSlug: z.string().min(1).max(140) });

router.get('/categories', listCategories);
router.get('/courses', validateQuery(courseListQuery), listCourses);
router.get('/courses/:idOrSlug/related', validateParams(idOrSlugParam), relatedCourses);
router.get('/courses/:idOrSlug', validateParams(idOrSlugParam), getCourse);
router.get('/courses/:courseId/lessons/:lessonId/video', requireAuth, lessonVideoUrl);

export default router;
