import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Singleton document with app-wide settings the admin dashboard controls
 * (id fixed to 'app'). The mobile app reads these at startup.
 */
const settingsSchema = new Schema(
  {
    _id: { type: String, default: 'app' },
    appName: { type: String, default: 'YDU Academy', trim: true },
    tagline: { type: String, default: 'Learn the dairy trade, one batch at a time.', trim: true },
    supportEmail: { type: String, default: 'support@ydu.academy', trim: true },
    supportPhone: { type: String, default: '+91 98765 43210', trim: true },
    currency: { type: String, default: 'INR' },
    /** When true the app shows a maintenance screen and blocks new purchases. */
    maintenanceMode: { type: Boolean, default: false },
    /** Minimum app build allowed to talk to this server, e.g. "1.2.0". Empty = no gate. */
    minAppVersion: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);

export async function getSettings() {
  return Settings.findById('app');
}
