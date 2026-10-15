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

/** One help question. */
const faqSchema = new Schema(
  {
    question: { type: String, default: '', trim: true, maxlength: 300 },
    answer: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { _id: false }
);

/** A clause block inside a policy: a heading, paragraphs and optional bullet points. */
const legalSectionSchema = new Schema(
  {
    heading: { type: String, default: '', trim: true, maxlength: 160 },
    body: { type: [String], default: [] },
    points: { type: [String], default: [] },
  },
  { _id: false }
);

/** A policy document (terms, refund, privacy, …). Empty = the app shows its built-in text. */
const legalDocSchema = new Schema(
  {
    title: { type: String, default: '', trim: true, maxlength: 60 },
    heading: { type: String, default: '', trim: true, maxlength: 160 },
    summary: { type: String, default: '', trim: true, maxlength: 200 },
    sections: { type: [legalSectionSchema], default: [] },
  },
  { _id: false }
);

/**
 * The academy's real contact details: the defaults for a new database, and what the public /legal
 * pages show when there is no Settings document. Admin → Settings can still change them.
 */
export const DEFAULT_SUPPORT_EMAIL = 'yduacademy@gmail.com';
export const DEFAULT_SUPPORT_PHONE = '+91 7489301982';

/** The demo values early builds seeded, swapped for the real ones by replaceDemoContactDetails. */
const DEMO_CONTACT = { supportEmail: 'support@ydu.academy', supportPhone: '+91 98765 43210' };

const settingsSchema = new Schema(
  {
    _id: { type: String, default: 'app' },
    appName: { type: String, default: 'YDU Academy', trim: true },
    tagline: { type: String, default: 'Learn the dairy trade, one batch at a time.', trim: true },
    supportEmail: { type: String, default: DEFAULT_SUPPORT_EMAIL, trim: true },
    supportPhone: { type: String, default: DEFAULT_SUPPORT_PHONE, trim: true },
    currency: { type: String, default: 'INR' },
    /** When true the app shows a maintenance screen and blocks new purchases. */
    maintenanceMode: { type: Boolean, default: false },
    /** Minimum app build allowed to talk to this server, e.g. "1.2.0". Empty = no gate. */
    minAppVersion: { type: String, default: '' },
    /** Server URL the app talks to, e.g. "https://api.example.com". Empty = the URL the app was built with (EXPO_PUBLIC_API_URL). */
    apiBaseUrl: { type: String, default: '', trim: true },
    /** Poster banners at the top of the app's home screen (max 5). Empty = featured courses. */
    homeBanners: { type: [homeBannerSchema], default: [] },
    /** How the app takes payment: 'web' = Razorpay hosted page in the browser, 'sdk' = native SDK (dev build). */
    checkoutMode: { type: String, enum: ['web', 'sdk'], default: 'web' },
    /** Help screen questions, in display order. Empty = the built-in FAQ. */
    faqs: { type: [faqSchema], default: [] },
    /** Policy documents. A missing document falls back to the app's built-in text. */
    legalDocs: {
      terms: { type: legalDocSchema, default: undefined },
      refund: { type: legalDocSchema, default: undefined },
      privacy: { type: legalDocSchema, default: undefined },
      /** How to delete an account without the app — the Play Console's "Delete account URL". */
      'delete-account': { type: legalDocSchema, default: undefined },
      about: { type: legalDocSchema, default: undefined },
      contact: { type: legalDocSchema, default: undefined },
      disclaimer: { type: legalDocSchema, default: undefined },
    },
    /** Lines shown on the checkout screen. Empty = the built-in list. */
    purchaseTerms: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);

export async function getSettings() {
  return Settings.findById('app');
}

/**
 * A database seeded by an earlier build still holds the demo contact details, which the policy pages
 * and the app would keep showing. Swap them for the real ones once, at connect time; a value an admin
 * typed in is never touched, because only the exact demo value matches.
 */
export async function replaceDemoContactDetails() {
  const real = { supportEmail: DEFAULT_SUPPORT_EMAIL, supportPhone: DEFAULT_SUPPORT_PHONE };
  for (const [field, demo] of Object.entries(DEMO_CONTACT)) {
    const result = await Settings.updateOne({ _id: 'app', [field]: demo }, { $set: { [field]: real[field] } });
    if (result.modifiedCount) console.log(`[db] replaced the demo ${field} with ${real[field]}`);
  }
}
