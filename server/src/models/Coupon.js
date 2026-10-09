import mongoose from 'mongoose';

const { Schema } = mongoose;

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 24 },
    description: { type: String, default: '', trim: true, maxlength: 200 },
    /** percent = % off, flat = ₹ off. */
    type: { type: String, enum: ['percent', 'flat'], required: true },
    /** Percent (1–90) or rupee amount depending on `type`. */
    value: { type: Number, required: true, min: 1 },
    /** 0 = unlimited redemptions. */
    maxUses: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Whether the coupon can currently be redeemed. */
couponSchema.methods.isUsable = function isUsable(now = new Date()) {
  if (!this.active) return false;
  if (this.maxUses > 0 && this.usedCount >= this.maxUses) return false;
  if (this.expiresAt && this.expiresAt < now) return false;
  return true;
};

/** Discount for a given price, floored at 0 and never above the price. */
couponSchema.methods.discountFor = function discountFor(priceInr) {
  if (this.type === 'flat') return Math.min(this.value, priceInr);
  return Math.round((priceInr * Math.min(this.value, 90)) / 100);
};

export const Coupon = mongoose.model('Coupon', couponSchema);
