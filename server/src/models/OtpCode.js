import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One live one-time code per phone number. Only an HMAC of the code is stored, never the
 * code itself. Documents expire on their own via the TTL index on `expiresAt`.
 */
const otpCodeSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: false }
);

export const OtpCode = mongoose.model('OtpCode', otpCodeSchema);
