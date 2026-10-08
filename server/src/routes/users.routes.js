import { Router } from 'express';
import { z } from 'zod';
import { updateMe } from '../controllers/users.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

const mePatchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  avatarUrl: z.string().trim().max(500).optional(),
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  city: z.string().trim().max(80).optional(),
  goal: z.string().trim().max(120).optional(),
  interests: z.array(z.string().trim().max(40)).max(20).optional(),
});

router.patch('/me', validateBody(mePatchSchema), updateMe);

export default router;
