import { Order } from '../../models/Order.js';
import { HttpError, asyncHandler } from '../../utils/http.js';
import { grantEnrollment } from '../shared.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Course } from '../../models/Course.js';
import { User } from '../../models/User.js';

/** GET /api/admin/orders — filterable order book with user lookups. */
export const listOrders = asyncHandler(async (req, res) => {
  const { status, search, limit } = req.validatedQuery;

  const filter = {};
  if (status) filter.status = status;

  // Search runs in the query, so it covers every order (not just the first `limit`) and the limit applies
  // to the matches. Learners and courses are matched by their own indexed-by-id lookups, then by id.
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [people, courses] = await Promise.all([
      User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').lean(),
      Course.find({ title: rx }).select('_id').lean(),
    ]);
    filter.$or = [
      { courseTitle: rx },
      { couponCode: rx },
      { paymentReference: rx },
      { razorpayOrderId: rx },
      { paymentLinkId: rx },
      { user: { $in: people.map((person) => person._id) } },
      { course: { $in: courses.map((course) => course._id) } },
    ];
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email')
    .populate('course', 'title slug')
    .lean();

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
