import { Router } from 'express';
import { z } from 'zod';
import * as categories from '../controllers/admin/categories.controller.js';
import * as coupons from '../controllers/admin/coupons.controller.js';
import * as courses from '../controllers/admin/courses.controller.js';
import * as orders from '../controllers/admin/orders.controller.js';
import * as reviews from '../controllers/admin/reviews.controller.js';
import * as settings from '../controllers/admin/settings.controller.js';
import { overview } from '../controllers/admin/stats.controller.js';
import * as users from '../controllers/admin/users.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// ---------- shared schemas -------------------------------------------------
const objectIdParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
const booleanString = z.enum(['true', 'false']);

// ---------- overview stats ---------------------------------------------------
router.get('/stats/overview', overview);

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
const lessonSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).default(''),
  minutes: z.number().int().min(1).max(600),
  isPreview: z.boolean().default(false),
  recipe: recipeSchema.optional().nullable(),
});
const sectionSchema = z.object({
  title: z.string().trim().min(1).max(140),
  summary: z.string().trim().max(1000).default(''),
  lessons: z.array(lessonSchema).default([]),
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
  sections: z.array(sectionSchema).default([]),
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
});

router.get('/settings', settings.getSettings);
router.put('/settings', validateBody(settingsSchema), settings.updateSettings);

export default router;
