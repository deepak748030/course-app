import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A message sent by the academy. `audience: 'all'` reaches every learner; `audience: 'user'` reaches one
 * learner. It is kept in the in-app inbox and pushed to every device registered for those learners.
 */
const notificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    kind: {
      type: String,
      enum: ['announcement', 'course-update', 'learning-reminder', 'product'],
      default: 'announcement',
    },
    audience: { type: String, enum: ['all', 'user'], required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    pushStatus: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'failed', 'no-devices'],
      default: 'queued',
    },
    pushDevices: { type: Number, default: 0 },
    pushFailed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
