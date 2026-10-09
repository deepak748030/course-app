import { isConnected } from '../config/db.js';
import { Coupon } from '../models/Coupon.js';
import { Course } from '../models/Course.js';
import { Order } from '../models/Order.js';
import { emitToAdmins, emitToUser } from '../realtime/socket.js';
import { trackEvent } from '../services/analytics.js';
import {
  paymentsConfigured,
  publicKeyId,
  razorpayClient,
  toPaise,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from '../services/razorpay.js';
import { HttpError, asyncHandler } from '../utils/http.js';
import { grantEnrollment } from './shared.js';

/**
 * Turns a paid Razorpay payment into an owned course. Safe to call twice (checkout verify and
 * the webhook can both arrive): the pending → paid switch is a single atomic update, so only
 * the first caller grants access and counts the coupon.
 */
async function markOrderPaid(order, { paymentId, method }) {
  const paid = await Order.findOneAndUpdate(
    { _id: order._id, status: { $ne: 'paid' } },
    { status: 'paid', paymentReference: paymentId, paymentMethod: method || 'razorpay' },
    { new: true }
  );
  if (!paid) return order.status === 'paid' ? order : Order.findById(order._id);

  await grantEnrollment(paid.user, paid.course);
  if (paid.couponCode) await Coupon.updateOne({ code: paid.couponCode }, { $inc: { usedCount: 1 } });
  emitToUser(String(paid.user), 'enrollment.granted', { courseId: String(paid.course), title: paid.courseTitle });
  // Server-emitted: revenue-trusted conversion events the client cannot fake.
  trackEvent({ userId: paid.user, event: 'order_paid', courseId: paid.course, meta: { amountInr: paid.amountInr } });
  emitToAdmins('order.created', {
    orderId: String(paid._id),
    courseTitle: paid.courseTitle,
    amountInr: paid.amountInr,
    status: 'paid',
  });
  return paid;
}

/** POST /api/payments/razorpay/order — prices the course on the server and opens a Razorpay order. */
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { courseId, couponCode } = req.body;
  if (!paymentsConfigured()) throw new HttpError(503, 'Payments are not configured on this server yet.');

  const course = await Course.findById(courseId);
  if (!course || !course.published) throw new HttpError(404, 'Course not found');

  const already = await Order.findOne({ user: req.user._id, course: course._id, status: 'paid' });
  if (already) throw new HttpError(409, 'You already own this course');

  let discountInr = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon || !coupon.isUsable()) throw new HttpError(404, 'This coupon is not valid');
    discountInr = coupon.discountFor(course.priceInr);
  }
  const amountInr = course.priceInr - discountInr;
  if (amountInr < 1) throw new HttpError(400, 'Amount is too small to pay online');

  // One pending row per attempt: a failed or abandoned attempt never blocks the next one, and
  // a late webhook for an earlier attempt still finds its own order.
  const order = await Order.create({
    user: req.user._id,
    course: course._id,
    courseTitle: course.title,
    amountInr,
    listAmountInr: course.listPriceInr || course.priceInr,
    couponCode: coupon ? coupon.code : '',
    discountInr,
    status: 'pending',
    paymentMethod: 'razorpay',
  });

  const rzpOrder = await razorpayClient().orders.create({
    amount: toPaise(amountInr),
    currency: 'INR',
    receipt: String(order._id),
    notes: { orderId: String(order._id), courseId: String(course._id) },
  });
  order.razorpayOrderId = rzpOrder.id;
  await order.save();

  res.status(201).json({
    order,
    razorpay: {
      keyId: publicKeyId(),
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      name: 'YDU Academy',
      description: course.title,
      prefill: {
        name: req.user.name,
        email: req.user.email || undefined,
        contact: req.user.phone || undefined,
      },
    },
  });
});

/**
 * POST /api/payments/razorpay/verify — checks the checkout signature, then confirms with Razorpay
 * that the payment was captured for exactly this order's amount before granting the course.
 */
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;

  const order = await Order.findOne({ razorpayOrderId: orderId, user: req.user._id });
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.status === 'paid') return res.json({ order });

  if (!verifyCheckoutSignature({ orderId, paymentId, signature })) {
    throw new HttpError(400, 'Payment could not be verified. Nothing was charged to your course.');
  }

  const payment = await razorpayClient().payments.fetch(paymentId);
  if (payment.order_id !== orderId || Number(payment.amount) !== toPaise(order.amountInr)) {
    throw new HttpError(400, 'Payment does not match this order.');
  }
  if (payment.status !== 'captured') {
    throw new HttpError(409, 'Payment is still being processed. Your course will unlock once it is confirmed.');
  }

  const paid = await markOrderPaid(order, { paymentId, method: payment.method });
  res.json({ order: paid });
});

/** POST /api/payments/razorpay/webhook — Razorpay's server-to-server confirmation (signed). */
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature') || '';
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ''));
  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }
  if (!isConnected()) return res.status(503).json({ error: 'Database not connected' });

  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.event === 'payment.captured') {
    const payment = event.payload?.payment?.entity;
    const order = payment && (await Order.findOne({ razorpayOrderId: payment.order_id }));
    if (order && Number(payment.amount) === toPaise(order.amountInr)) {
      await markOrderPaid(order, { paymentId: payment.id, method: payment.method });
    }
  }
  res.json({ ok: true });
});

