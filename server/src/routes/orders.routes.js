import { Router } from 'express';
import { myOrders } from '../controllers/orders.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/my', myOrders);

export default router;
