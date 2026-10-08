import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { uploadsProvider, storeImage } from '../services/uploads.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const router = Router();

// Kept in memory: images are small (≤8 MB) and go straight to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(new HttpError(415, 'Only image files are allowed (jpeg, png, webp, gif, avif)'));
  },
});

/** Which storage backend answers uploads — handy for the dashboards. */
router.get('/policy', (_req, res) => {
  res.json({ provider: uploadsProvider, maxBytes: 8 * 1024 * 1024 });
});

/**
 * POST /api/uploads  (multipart, field `file`, optional `folder`)
 * Any signed-in user may upload (learners: avatars — admins: covers).
 * Returns { url, publicId, provider }.
 */
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Send an image in the "file" field');
    const folder =
      req.user.role === 'admin' ? `ydu-academy/${req.body.folder || 'covers'}` : 'ydu-academy/avatars';
    const stored = await storeImage(req.file.buffer, { folder, originalName: req.file.originalname });
    res.status(201).json(stored);
  })
);

export default router;
