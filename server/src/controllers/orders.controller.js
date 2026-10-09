import { Order } from '../models/Order.js';
import { asyncHandler } from '../utils/http.js';

/** GET /api/orders/my — the learner's transaction history. */
export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('course', 'slug title')
    .select('-__v')
    .lean();
  res.json({ orders });
});
