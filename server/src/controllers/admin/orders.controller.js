import { Order } from '../../models/Order.js';
import { HttpError, asyncHandler } from '../../utils/http.js';
import { grantEnrollment } from '../shared.js';
import { Enrollment } from '../../models/Enrollment.js';

/** GET /api/admin/orders — filterable order book with user lookups. */
export const listOrders = asyncHandler(async (req, res) => {
  const { status, search, limit } = req.validatedQuery;

  const filter = {};
  if (status) filter.status = status;

  let orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email')
    .populate('course', 'title slug')
    .lean();

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    orders = orders.filter(
      (o) =>
        rx.test(o.courseTitle) ||
        rx.test(o.course?.title || '') ||
        rx.test(o.user?.name || '') ||
        rx.test(o.user?.email || '') ||
        rx.test(o.couponCode || '')
    );
  }

  const totals = orders.reduce(
    (acc, o) => {
      acc.count += 1;
      if (o.status === 'paid') {
        acc.paid += o.amountInr;
        acc.discounts += o.discountInr || 0;
      }
      return acc;
    },
    { count: 0, paid: 0, discounts: 0 }
  );

  res.json({ orders, totals });
});

/**
 * PATCH /api/admin/orders/:id — change status. The side effects keep access in sync:
 * marking paid grants the enrollment, refunding removes it.
 */
export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new HttpError(404, 'Order not found');

  const { status } = req.body;
  const previous = order.status;
  order.status = status;
  await order.save();

  if (status === 'paid' && previous !== 'paid') {
    await grantEnrollment(order.user, order.course);
  }
  if (status === 'refunded' && previous === 'paid') {
    await Enrollment.deleteOne({ user: order.user, course: order.course });
  }

  res.json({ order });
});
