import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One row per device push token (Expo push token from the app). A token belongs to whichever account
 * is signed in on that device right now: registering it again under another account moves it.
 */
const pushTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, trim: true, maxlength: 200 },
    platform: { type: String, enum: ['ios', 'android', 'web', 'unknown'], default: 'unknown' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PushToken = mongoose.model('PushToken', pushTokenSchema);
