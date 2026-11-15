import { Router } from 'express';
import { getClusterRuntimeState } from '../cluster.js';
import { dbState } from '../config/db.js';
import { streamLessonVideo } from '../controllers/catalog.controller.js';
import { dbGuard } from '../middleware/dbGuard.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { cacheStats } from '../services/cache.js';
import { cpuPoolStats } from '../services/cpuPool.js';
import adminRoutes from './admin.routes.js';
import analyticsRoutes from './analytics.routes.js';
import authRoutes from './auth.routes.js';
import catalogRoutes from './catalog.routes.js';
import couponsRoutes from './coupons.routes.js';
import enrollmentsRoutes from './enrollments.routes.js';
import notificationsRoutes from './notifications.routes.js';
import ordersRoutes from './orders.routes.js';
import paymentsRoutes from './payments.routes.js';
import reviewsRoutes from './reviews.routes.js';
import settingsRoutes from './settings.routes.js';
import uploadsRoutes from './uploads.routes.js';
import usersRoutes from './users.routes.js';

const router = Router();
const streamLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });

/** Health probe — works even while MongoDB is down. */
router.get('/health', (_req, res) => {
  const state = dbState();
  const clusterState = getClusterRuntimeState();
  const cpuPool = cpuPoolStats();
  const cache = cacheStats();
  res.status(state === 'connected' ? 200 : 503).json({
    ok: state === 'connected',
    db: state,
    redis: cache.redis,
    uptimeSeconds: Math.round(process.uptime()),
    runtime: {
      ...clusterState,
      cpuPoolActiveThreads: cpuPool.activeThreads,
      cpuPoolMaxThreads: cpuPool.maxThreads,
      cacheEntries: cache.l1Entries,
    },
  });
});

/** Signed local video streaming (supports HTTP Range 206 seeking; reads from uploads/videos/). */
router.get('/videos/stream', streamLimiter, streamLessonVideo);

// Everything below needs the database.
router.use(dbGuard);

router.use('/auth', authRoutes);
router.use('/', catalogRoutes); // /api/categories, /api/courses
router.use('/analytics', analyticsRoutes); // /api/analytics/events
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/users', usersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/', reviewsRoutes); // /api/courses/:courseId/reviews
router.use('/coupons', couponsRoutes);
router.use('/settings', settingsRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/admin', adminRoutes);

export default router;
