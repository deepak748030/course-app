import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A purchase. `courseTitle` is snapshotted so order history survives a course being
 * edited or deleted — the admin table and the learner's transactions never blank out.
 */
const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    courseTitle: { type: String, default: '' },
    amountInr: { type: Number, required: true, min: 0 },
    /** Price before discount, when a coupon or list price applies. */
    listAmountInr: { type: Number, min: 0 },
    couponCode: { type: String, default: '', uppercase: true, trim: true },
    discountInr: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: { type: String, default: 'upi', trim: true },
    paymentReference: { type: String, default: '' },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
// "You already own this course" lookups + the learner's transaction list.
orderSchema.index({ user: 1, status: 1 });
// Admin order book filtered by status, newest first.
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
