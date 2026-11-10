import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { IMAGE_MIME_TYPES, isValidImageBuffer, safeImageFolder, storeImage, uploadsProvider } from '../services/uploads.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const router = Router();
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Kept in memory briefly while validating magic bytes, then written straight to server/uploads/<folder>.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (IMAGE_MIME_TYPES[file.mimetype]) cb(null, true);
    else cb(new HttpError(415, 'Only image files are allowed (jpeg, png, webp, gif, avif)'));
  },
});

function handleImageUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(413, 'Image is larger than the 8 MB limit'));
    }
    return next(err instanceof HttpError ? err : new HttpError(400, err.message || 'Image upload failed'));
  });
}

/** Which storage backend answers uploads — always 'local' (server/uploads). */
router.get('/policy', (_req, res) => {
  res.json({ provider: uploadsProvider, maxBytes: MAX_IMAGE_BYTES });
});

/**
 * POST /api/uploads  (multipart, field `file`, optional `folder`)
 * Any signed-in user may upload (learners: avatars — admins: covers, banners, …).
 * Returns { url, publicId, provider }.
 */
router.post(
  '/',
  requireAuth,
  handleImageUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Send an image in the "file" field');
    if (!isValidImageBuffer(req.file.buffer, req.file.mimetype)) {
      throw new HttpError(415, 'Uploaded file does not match a valid image format');
    }
    const folder = req.user.role === 'admin' ? safeImageFolder(req.body.folder || 'covers') : 'avatars';
    const stored = await storeImage(req.file.buffer, {
      folder,
      mimetype: req.file.mimetype,
    });
    res.status(201).json(stored);
  })
);

export default router;
