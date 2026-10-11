import fs from 'node:fs';
import os from 'node:os';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as categories from '../controllers/admin/categories.controller.js';
import * as coupons from '../controllers/admin/coupons.controller.js';
import * as courses from '../controllers/admin/courses.controller.js';
import * as orders from '../controllers/admin/orders.controller.js';
import * as reviews from '../controllers/admin/reviews.controller.js';
import * as settings from '../controllers/admin/settings.controller.js';
import { overview as analyticsOverview } from '../controllers/admin/analytics.controller.js';
import { overview } from '../controllers/admin/stats.controller.js';
import * as users from '../controllers/admin/users.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { MAX_VIDEO_BYTES, VIDEO_QUALITIES, VIDEO_TYPES, storeVideo, videoStorageConfigured, videoStorageProblem } from '../services/videoStorage.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// ---------- shared schemas -------------------------------------------------
const objectIdParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
const booleanString = z.enum(['true', 'false']);

// ---------- overview stats ---------------------------------------------------
router.get('/stats/overview', overview);

// ---------- behaviour analytics ------------------------------------------------
const analyticsDaysQuery = z.object({ days: z.coerce.number().int().min(7).max(365).optional() });
router.get('/analytics/overview', validateQuery(analyticsDaysQuery), analyticsOverview);

// ---------- course videos (Backblaze B2, private bucket) -----------------------
router.get('/uploads/video/status', (_req, res) => {
  res.json({ configured: videoStorageConfigured, maxBytes: MAX_VIDEO_BYTES, types: Object.keys(VIDEO_TYPES), qualities: VIDEO_QUALITIES });
});

// Videos are written to a temp file first, then streamed to B2. Multer's limit stops oversize files.
const videoUpload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (VIDEO_TYPES[file.mimetype]) cb(null, true);
    else cb(new HttpError(415, 'Only MP4, WebM or MOV videos are allowed'));
  },
});

function handleVideoUpload(req, res, next) {
  videoUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(413, 'This video is larger than the 4 GB limit'));
    }
    return next(err instanceof HttpError ? err : new HttpError(400, err.message || 'Upload failed'));
  });
}

/**
 * POST /api/admin/uploads/video — multipart field `file` (+ optional `courseId`).
 * Streams the video to the private bucket and returns the object key the lesson stores.
 */
router.post(
  '/uploads/video',
  (req, _res, next) => {
    req.setTimeout(0); // large videos take a while over slow connections
    next();
  },
  handleVideoUpload,
  asyncHandler(async (req, res) => {
    const file = req.file;
    const cleanup = () => file && fs.promises.rm(file.path, { force: true }).catch(() => {});
    try {
      if (!file) throw new HttpError(400, 'Send a video in the "file" field');
      if (!videoStorageConfigured) {
        throw new HttpError(503, `Video storage is not set up: ${videoStorageProblem()}.`);
      }
      const courseId = typeof req.body.courseId === 'string' ? req.body.courseId : '';
      const courseKey = /^[a-f\d]{24}$/i.test(courseId) ? courseId : 'drafts';
      const quality = typeof req.body.quality === 'string' ? req.body.quality : '';
      if (!VIDEO_QUALITIES.includes(quality)) {
        throw new HttpError(400, 'Choose the video quality: 360, 480, 720 or 1080');
      }
      let key;
      try {
        key = await storeVideo({
          courseKey,
          filePath: file.path,
          fileName: file.originalname,
          contentType: file.mimetype,
          size: file.size,
          quality,
        });
      } catch (err) {
        console.error('[uploads] could not store video in B2:', err?.message || err);
        throw new HttpError(503, 'Could not store the video in Backblaze B2. Check the B2_* values in server/.env.');
      }
      res.status(201).json({ key, quality, size: file.size, contentType: file.mimetype });
    } finally {
      await cleanup();
    }
  })
);

// ---------- courses ------------------------------------------------------------
const ingredientSchema = z.object({
  item: z.string().trim().min(1).max(140),
  quantity: z.string().trim().min(1).max(80),
});
const recipeSchema = z.object({
  title: z.string().trim().min(1).max(140),
  servings: z.number().int().min(1).max(500),
  prepMinutes: z.number().int().min(0).default(0),
  cookMinutes: z.number().int().min(0).default(0),
  ingredients: z.array(ingredientSchema).max(40).default([]),
  steps: z.array(z.string().trim().max(500)).max(40).default([]),
  tips: z.array(z.string().trim().max(280)).max(20).default([]),
});
const lessonVideoSchema = z.object({
  quality: z.enum(['360', '480', '720', '1080']),
  videoKey: z.string().trim().max(300).regex(/^courses\/[\w./-]+$/, 'Invalid video key'),
});
const lessonSchema = z
  .object({
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().max(2000).default(''),
    minutes: z.number().int().min(1).max(600),
    isPreview: z.boolean().default(false),
    videoKey: z
      .string()
      .trim()
      .max(300)
      .regex(/^(courses\/[\w./-]+)?$/, 'Invalid video key')
      .default(''),
    videos: z.array(lessonVideoSchema).max(4).default([]),
    durationSec: z.number().int().min(0).max(86400).default(0),
    recipe: recipeSchema.optional().nullable(),
  })
  .transform((lesson) => {
    // Best available quality also goes in `videoKey` so older app builds keep playing.
    const best = [...lesson.videos].sort((a, b) => Number(b.quality) - Number(a.quality))[0];
    return { ...lesson, videoKey: best ? best.videoKey : lesson.videoKey };
  });
const courseSchema = z.object({
  title: z.string().trim().min(2).max(140),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/).optional(),
  promise: z.string().trim().max(280).default(''),
  description: z.string().trim().max(8000).default(''),
  coverUrl: z.string().trim().max(500).default(''),
  category: z.string().regex(/^[a-f\d]{24}$/i),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  language: z.string().trim().max(60).default('English'),
  priceInr: z.number().min(0),
  listPriceInr: z.number().min(0).optional().nullable(),
  published: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  isBeginnerPick: z.boolean().default(false),
  outcomes: z.array(z.string().trim().max(280)).max(20).default([]),
  equipment: z.array(z.string().trim().max(280)).max(20).default([]),
  audience: z.string().trim().max(500).default(''),
  lessons: z.array(lessonSchema).default([]),
});

const courseListQuery = z.object({
  search: z.string().max(100).optional(),
  category: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  published: booleanString.optional(),
  sort: z.enum(['recent', 'price', 'rating']).default('recent'),
});

const publishSchema = z.object({ published: z.boolean() });

router.get('/courses', validateQuery(courseListQuery), courses.listCourses);
router.get('/courses/:id', validateParams(objectIdParam), courses.getCourse);
router.post('/courses', validateBody(courseSchema), courses.createCourse);
router.put('/courses/:id', validateParams(objectIdParam), validateBody(courseSchema.partial()), courses.updateCourse);
router.patch('/courses/:id/publish', validateParams(objectIdParam), validateBody(publishSchema), courses.setPublished);
router.delete('/courses/:id', validateParams(objectIdParam), courses.deleteCourse);

// ---------- categories -----------------------------------------------------------
const categorySchema = z.object({
  label: z.string().trim().min(2).max(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/).optional(),
  icon: z.string().trim().max(40).default('Shapes'),
  sortOrder: z.number().int().min(0).default(0),
});

router.get('/categories', categories.listCategories);
router.post('/categories', validateBody(categorySchema), categories.createCategory);
router.put('/categories/:id', validateParams(objectIdParam), validateBody(categorySchema.partial()), categories.updateCategory);
router.delete('/categories/:id', validateParams(objectIdParam), categories.deleteCategory);

// ---------- users -------------------------------------------------------------------
const userListQuery = z.object({
  search: z.string().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
  blocked: booleanString.optional(),
});
const userPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(20),
    role: z.enum(['user', 'admin']),
    blocked: z.boolean(),
  })
  .partial();

router.get('/users', validateQuery(userListQuery), users.listUsers);
router.get('/users/:id', validateParams(objectIdParam), users.getUser);
router.patch('/users/:id', validateParams(objectIdParam), validateBody(userPatchSchema), users.updateUser);
router.delete('/users/:id', validateParams(objectIdParam), users.deleteUser);

// ---------- orders ---------------------------------------------------------------------
const orderListQuery = z.object({
  status: z.enum(['pending', 'paid', 'refunded']).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});
const orderPatchSchema = z.object({ status: z.enum(['pending', 'paid', 'refunded']) });

router.get('/orders', validateQuery(orderListQuery), orders.listOrders);
router.patch('/orders/:id', validateParams(objectIdParam), validateBody(orderPatchSchema), orders.updateOrder);

// ---------- reviews -----------------------------------------------------------------------
const reviewListQuery = z.object({ visible: booleanString.optional() });
const reviewPatchSchema = z.object({ visible: z.boolean() });

router.get('/reviews', validateQuery(reviewListQuery), reviews.listReviews);
router.patch('/reviews/:id', validateParams(objectIdParam), validateBody(reviewPatchSchema), reviews.updateReview);
router.delete('/reviews/:id', validateParams(objectIdParam), reviews.deleteReview);

// ---------- coupons ---------------------------------------------------------------------------
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/),
  description: z.string().trim().max(200).default(''),
  type: z.enum(['percent', 'flat']),
  value: z.number().min(1),
  maxUses: z.number().int().min(0).default(0),
  expiresAt: z.coerce.date().optional().nullable(),
  active: z.boolean().default(true),
});
const couponUpdateSchema = couponSchema.partial().omit({ code: true }).extend({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/).optional() });

router.get('/coupons', coupons.listCoupons);
router.post('/coupons', validateBody(couponSchema), coupons.createCoupon);
router.put('/coupons/:id', validateParams(objectIdParam), validateBody(couponUpdateSchema), coupons.updateCoupon);
router.delete('/coupons/:id', validateParams(objectIdParam), coupons.deleteCoupon);

// ---------- settings ---------------------------------------------------------------------------
const settingsSchema = z.object({
  appName: z.string().trim().min(2).max(60).optional(),
  tagline: z.string().trim().max(200).optional(),
  supportEmail: z.string().trim().email().optional(),
  supportPhone: z.string().trim().max(30).optional(),
  currency: z.string().trim().length(3).optional(),
  maintenanceMode: z.boolean().optional(),
  minAppVersion: z.string().trim().max(20).optional(),
  checkoutMode: z.enum(['web', 'sdk']).optional(),
  homeBanners: z
    .array(
      z.object({
        imageUrl: z.string().trim().max(500).default(''),
        title: z.string().trim().max(80).default(''),
        subtitle: z.string().trim().max(160).default(''),
        courseSlug: z.string().trim().max(80).default(''),
        active: z.boolean().default(true),
      })
    )
    .max(5)
    .optional(),
});

router.get('/settings', settings.getSettings);
router.put('/settings', validateBody(settingsSchema), settings.updateSettings);

export default router;
