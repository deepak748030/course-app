import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Singleton document with app-wide settings the admin dashboard controls
 * (id fixed to 'app'). The mobile app reads these at startup.
 */
/** One home-screen banner. Image falls back to the linked course's cover when empty. */
const homeBannerSchema = new Schema(
  {
    imageUrl: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    subtitle: { type: String, default: '', trim: true },
    /** Slug of the course the banner opens. Empty = banner is informational only. */
    courseSlug: { type: String, default: '', trim: true },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

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
    /** Poster banners at the top of the app's home screen (max 5). Empty = featured courses. */
    homeBanners: { type: [homeBannerSchema], default: [] },
    /** How the app takes payment: 'web' = Razorpay hosted page in the browser, 'sdk' = native SDK (dev build). */
    checkoutMode: { type: String, enum: ['web', 'sdk'], default: 'web' },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);

export async function getSettings() {
  return Settings.findById('app');
}
