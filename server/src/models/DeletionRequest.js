import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Closed requests are kept this long (as the record that they were handled), then removed by the TTL index. */
export const DELETION_RECORD_DAYS = 180;

/**
 * A request to delete an account and its data (Google Play's account-deletion requirement).
 *
 *  - `source: 'web'` — sent from the public /delete-account page, usually by someone who no longer has
 *    the app. An admin confirms it with the account holder and processes it from the dashboard.
 *  - `source: 'app'` — the learner deleted their own account in the app. Kept only as the record that
 *    the deletion happened.
 *
 * When a request is closed (completed or rejected) the mobile number is masked and `purgeAt` is set, so
 * the record disappears DELETION_RECORD_DAYS later — exactly what the privacy policy promises.
 */
const deletionRequestSchema = new Schema(
  {
    /** Shown to the requester, e.g. DEL-7K2Q9X. */
    reference: { type: String, required: true, unique: true },
    /** 10-digit mobile while the request is open; masked (XXXXXX3210) once it is closed. */
    phone: { type: String, required: true, trim: true, index: true },
    name: { type: String, default: '', trim: true, maxlength: 80 },
    reason: { type: String, default: '', trim: true, maxlength: 80 },
    details: { type: String, default: '', trim: true, maxlength: 1000 },
    source: { type: String, enum: ['web', 'app'], default: 'web' },
    status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending', index: true },
    /** True when closing the request actually removed an account. */
    accountDeleted: { type: Boolean, default: false },
    /** Admin's note when closing, e.g. "Confirmed on a call" or "Could not verify the number". */
    note: { type: String, default: '', trim: true, maxlength: 500 },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    closedAt: { type: Date, default: null },
    purgeAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Documents without a purgeAt date (open requests) are never expired.
deletionRequestSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
deletionRequestSchema.index({ status: 1, createdAt: -1 });

export const DeletionRequest = mongoose.model('DeletionRequest', deletionRequestSchema);

/** XXXXXX3210 — enough to recognise a number in the record, not enough to contact anyone. */
export function maskPhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 4) return 'XXXXXXXXXX';
  return `${'X'.repeat(Math.max(digits.length - 4, 6))}${digits.slice(-4)}`;
}

/** The fields that close a request: masked number, closing time and the purge date. */
export function closingFields(phone, now = new Date()) {
  return {
    phone: maskPhone(phone),
    closedAt: now,
    purgeAt: new Date(now.getTime() + DELETION_RECORD_DAYS * 24 * 60 * 60 * 1000),
  };
}
