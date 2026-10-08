import { Coupon } from '../models/Coupon.js';
import { Course } from '../models/Course.js';
import { Order } from '../models/Order.js';
import { emitToAdmins, emitToUser } from '../realtime/socket.js';
import { HttpError, asyncHandler } from '../utils/http.js';
import { grantEnrollment } from './shared.js';

/**
 * POST /api/orders — checkout. The demo flow creates the order already paid
 * (matching the app's demo payment gateway); a real gateway integration would create it
 * 'pending' first and flip it to 'paid' from a webhook.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { courseId, couponCode, paymentMethod, paymentReference, status } = req.body;

  const course = await Course.findById(courseId);
  if (!course || !course.published) throw new HttpError(404, 'Course not found');

  let discountInr = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon || !coupon.isUsable()) throw new HttpError(404, 'This coupon is not valid');
    discountInr = coupon.discountFor(course.priceInr);
  }

  const already = await Order.findOne({
    user: req.user._id,
    course: course._id,
    status: { $in: ['paid', 'pending'] },
  });
  if (already) throw new HttpError(409, 'You already own this course');

  const order = await Order.create({
    user: req.user._id,
    course: course._id,
    courseTitle: course.title,
    amountInr: course.priceInr - discountInr,
    listAmountInr: course.listPriceInr || course.priceInr,
    couponCode: coupon ? coupon.code : '',
    discountInr,
    paymentMethod: paymentMethod || 'upi',
    paymentReference: paymentReference || `demo_${Date.now().toString(36)}`,
    status: status === 'pending' ? 'pending' : 'paid',
  });

  if (order.status === 'paid') {
    await grantEnrollment(req.user._id, course._id);
    if (coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
    emitToUser(String(req.user._id), 'enrollment.granted', { courseId: String(course._id), title: course.title });
  }

  emitToAdmins('order.created', {
    orderId: String(order._id),
    courseTitle: course.title,
    learner: req.user.name,
    amountInr: order.amountInr,
    status: order.status,
  });

  res.status(201).json({ order });
});

/** GET /api/orders/my — the learner's transaction history. */
export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('course', 'slug title')
    .select('-__v')
    .lean();
  res.json({ orders });
});
