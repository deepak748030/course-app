import fs from 'node:fs';
import os from 'node:os';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as account from '../controllers/admin/account.controller.js';
import * as categories from '../controllers/admin/categories.controller.js';
import * as coupons from '../controllers/admin/coupons.controller.js';
import * as courses from '../controllers/admin/courses.controller.js';
import * as deletionRequests from '../controllers/admin/deletionRequests.controller.js';
import * as notifications from '../controllers/admin/notifications.controller.js';
import * as orders from '../controllers/admin/orders.controller.js';
import * as reviews from '../controllers/admin/reviews.controller.js';
import * as settings from '../controllers/admin/settings.controller.js';
import { overview as analyticsOverview } from '../controllers/admin/analytics.controller.js';
import { overview } from '../controllers/admin/stats.controller.js';
import * as users from '../controllers/admin/users.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { MAX_VIDEO_BYTES, VIDEO_QUALITIES, VIDEO_TYPES, getUploadProgress, storeVideo, videoStorageConfigured, videoStorageProblem } from '../services/videoStorage.js';
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
/** Storage-stage progress of one upload; the admin polls it while the file is copied to B2. */
router.get('/uploads/video/progress/:id', (req, res) => {
  const entry = /^[\w-]{8,64}$/.test(req.params.id) ? getUploadProgress(req.params.id) : null;
  res.json(entry ?? { stage: 'waiting' });
});

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
    const headerId = String(req.headers['x-upload-id'] || '');
    const progressId = /^[\w-]{8,64}$/.test(headerId) ? headerId : '';
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
          progressId,
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
    previewSec: z.number().int().min(0).max(86400).default(0),
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
    // A preview cannot run past the end of the lesson; unmeasured lessons keep the value as typed.
    const previewSec = lesson.durationSec > 0 ? Math.min(lesson.previewSec, lesson.durationSec) : lesson.previewSec;
    return { ...lesson, previewSec, isPreview: previewSec > 0, videoKey: best ? best.videoKey : lesson.videoKey };
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
const legalSectionInput = z.object({
  heading: z.string().trim().min(1).max(160),
  body: z.array(z.string().trim().max(1000)).max(20).default([]),
  points: z.array(z.string().trim().max(300)).max(20).default([]),
});
const legalDocInput = z
  .object({
    title: z.string().trim().min(1).max(60),
    heading: z.string().trim().max(160).default(''),
    summary: z.string().trim().max(200).default(''),
    sections: z.array(legalSectionInput).max(30).default([]),
  })
  .nullable();

/** Empty, or a valid email address. */
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .refine((value) => value === '' || z.string().email().safeParse(value).success, 'Enter a valid email address, or leave it empty.');

/**
 * Business details shown on the public pages and filled into the policies. Every field is optional, and
 * only the fields sent are changed (the controller writes them one by one), so a partial save never
 * blanks the rest.
 */
const businessInput = z.object({
  legalName: z.string().trim().max(120).optional(),
  address: z.string().trim().max(400).optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .max(15)
    .refine((value) => value === '' || /^\d{2}[A-Z0-9]{13}$/.test(value), 'A GSTIN has 15 characters and starts with the 2-digit state code.')
    .optional(),
  supportHours: z.string().trim().max(80).optional(),
  grievanceName: z.string().trim().max(80).optional(),
  grievanceEmail: optionalEmail.optional(),
  grievancePhone: z.string().trim().max(30).optional(),
  jurisdiction: z.string().trim().max(80).optional(),
  websiteUrl: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === '' || /^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(value), 'Enter a full URL starting with https://, or leave it empty.')
    .transform((value) => value.replace(/\/+$/, ''))
    .optional(),
});

const settingsSchema = z.object({
  appName: z.string().trim().min(2).max(60).optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(300),
        answer: z.string().trim().max(2000).default(''),
      })
    )
    .max(50)
    .optional(),
  legalDocs: z
    .object({
      terms: legalDocInput.optional(),
      refund: legalDocInput.optional(),
      privacy: legalDocInput.optional(),
      delivery: legalDocInput.optional(),
      deletion: legalDocInput.optional(),
      about: legalDocInput.optional(),
    })
    .optional(),
  business: businessInput.optional(),
  purchaseTerms: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
  tagline: z.string().trim().max(200).optional(),
  supportEmail: z.string().trim().email().optional(),
  supportPhone: z.string().trim().max(30).optional(),
  currency: z.string().trim().length(3).optional(),
  maintenanceMode: z.boolean().optional(),
  minAppVersion: z.string().trim().max(20).optional(),
  apiBaseUrl: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === '' || /^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(value), 'Enter a full URL starting with http:// or https://, or leave it empty.')
    .transform((value) => value.replace(/\/+$/, ''))
    .optional(),
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

/** Admin login (username = login email) and password. Needs the current password to change either. */
const accountSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120).optional(),
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, 'The new password needs at least 8 characters').max(128).optional(),
});
router.patch('/account', validateBody(accountSchema), account.updateAccount);

// ---------- account deletion requests (public /delete-account form + in-app deletions) ----------
const deletionListQuery = z.object({
  status: z.enum(['pending', 'completed', 'rejected', 'all']).default('pending'),
});
const deletionUpdateSchema = z
  .object({
    status: z.enum(['completed', 'rejected']),
    deleteAccount: z.boolean().default(false),
    note: z.string().trim().max(500).default(''),
  })
  .refine((value) => value.status === 'completed' || !value.deleteAccount, {
    message: 'Only a completed request can delete the account',
    path: ['deleteAccount'],
  });
router.get('/deletion-requests', validateQuery(deletionListQuery), deletionRequests.listDeletionRequests);
router.patch(
  '/deletion-requests/:id',
  validateParams(objectIdParam),
  validateBody(deletionUpdateSchema),
  deletionRequests.updateDeletionRequest
);

router.get('/settings', settings.getAdminSettings);
router.put('/settings', validateBody(settingsSchema), settings.updateSettings);

// ---------- notifications (in-app inbox + push) ----------------------------------
const notificationKinds = ['announcement', 'course-update', 'learning-reminder', 'product'];
const sendNotificationSchema = z
  .object({
    audience: z.enum(['all', 'user']),
    userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid learner').optional(),
    title: z.string().trim().min(1, 'Add a title').max(120),
    body: z.string().trim().min(1, 'Write the message').max(500),
    kind: z.enum(notificationKinds).default('announcement'),
    courseId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'Invalid course')
      .optional()
      .or(z.literal(''))
      .transform((value) => value || undefined),
  })
  .refine((value) => value.audience !== 'user' || value.userId, {
    message: 'Choose a learner',
    path: ['userId'],
  });

router.get('/notifications', notifications.listNotifications);
router.post('/notifications', validateBody(sendNotificationSchema), notifications.sendNotification);

export default router;
