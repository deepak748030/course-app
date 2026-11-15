import { Router } from 'express';
import { z } from 'zod';
import { deleteMe, updateMe } from '../controllers/users.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { normalizeUploadUrl } from '../services/uploads.js';

const router = Router();
router.use(requireAuth);

const mePatchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .transform(normalizeUploadUrl)
    .refine(
      (v) => v === '' || /^\/uploads\/avatars\/(?!.*\.\.)[\w.-]+$/i.test(v) || /^https:\/\//i.test(v),
      'Invalid avatar URL'
    )
    .optional(),
  city: z.string().trim().max(80).optional(),
  goal: z.string().trim().max(120).optional(),
  interests: z.array(z.string().trim().regex(/^[a-z0-9-]{1,40}$/i)).max(20).optional(),
});

router.patch('/me', validateBody(mePatchSchema), updateMe);
/** Account deletion, offered in the app itself (Google Play requires the mechanism to exist). */
router.delete('/me', deleteMe);

export default router;
