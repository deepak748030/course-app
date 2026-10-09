import { Router } from 'express';
import { z } from 'zod';
import { createOrder, myOrders } from '../controllers/orders.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

const createOrderSchema = z.object({
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course id'),
  couponCode: z.string().trim().toUpperCase().max(24).optional(),
  paymentMethod: z.string().trim().max(40).optional(),
  paymentReference: z.string().trim().max(120).optional(),
  status: z.enum(['pending', 'paid']).optional(),
});

router.post('/', validateBody(createOrderSchema), createOrder);
router.get('/my', myOrders);

export default router;
