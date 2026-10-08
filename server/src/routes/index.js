import { Router } from 'express';
import { dbState } from '../config/db.js';
import { dbGuard } from '../middleware/dbGuard.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import catalogRoutes from './catalog.routes.js';
import couponsRoutes from './coupons.routes.js';
import ordersRoutes from './orders.routes.js';
import reviewsRoutes from './reviews.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();

/** Health probe — works even while MongoDB is down. */
router.get('/health', (_req, res) => {
  const state = dbState();
  res.status(state === 'connected' ? 200 : 503).json({
    ok: state === 'connected',
    db: state,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// Everything below needs the database.
router.use(dbGuard);

router.use('/auth', authRoutes);
router.use('/', catalogRoutes); // /api/categories, /api/courses
router.use('/orders', ordersRoutes);
router.use('/', reviewsRoutes); // /api/courses/:courseId/reviews
router.use('/coupons', couponsRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);

export default router;
