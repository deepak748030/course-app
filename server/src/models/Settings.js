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

/**
 * A policy or information document (terms, privacy, refund, delivery, deletion, about). A missing one
 * = the built-in text in data/defaultContent.js. `updatedAt` is set by the server whenever the text
 * changes and is shown as "Last updated" on the public pages.
 */
const legalDocSchema = new Schema(
  {
    title: { type: String, default: '', trim: true, maxlength: 60 },
    heading: { type: String, default: '', trim: true, maxlength: 160 },
    summary: { type: String, default: '', trim: true, maxlength: 200 },
    sections: { type: [legalSectionSchema], default: [] },
    updatedAt: { type: Date },
  },
  { _id: false }
);

/**
 * Who runs the academy. Shown on the public Contact page and filled into the policies
 * ({{legalName}}, {{address}}, {{grievanceName}} …). Empty fields are simply left out.
 */
const businessSchema = new Schema(
  {
    /** Registered business / legal entity name. Empty = the app name. */
    legalName: { type: String, default: '', trim: true, maxlength: 120 },
    /** Registered or postal address (multi-line allowed). Razorpay asks for it on the Contact page. */
    address: { type: String, default: '', trim: true, maxlength: 400 },
    gstin: { type: String, default: '', trim: true, uppercase: true, maxlength: 15 },
    supportHours: { type: String, default: '', trim: true, maxlength: 80 },
    /** Grievance Officer required by the IT Rules / DPDP Act. Email and phone fall back to support. */
    grievanceName: { type: String, default: '', trim: true, maxlength: 80 },
    grievanceEmail: { type: String, default: '', trim: true, lowercase: true, maxlength: 120 },
    grievancePhone: { type: String, default: '', trim: true, maxlength: 30 },
    /** City whose courts handle disputes, e.g. "Bhopal, Madhya Pradesh". */
    jurisdiction: { type: String, default: '', trim: true, maxlength: 80 },
    /** Public address of the policy pages (the admin dashboard's domain), e.g. "https://ydu.academy". */
    websiteUrl: { type: String, default: '', trim: true, maxlength: 200 },
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
    /** Server URL the app talks to, e.g. "https://api.example.com". Empty = the URL the app was built with (EXPO_PUBLIC_API_URL). */
    apiBaseUrl: { type: String, default: '', trim: true },
    /** Poster banners at the top of the app's home screen (max 5). Empty = featured courses. */
    homeBanners: { type: [homeBannerSchema], default: [] },
    /** How the app takes payment: 'web' = Razorpay hosted page in the browser, 'sdk' = native SDK (dev build). */
    checkoutMode: { type: String, enum: ['web', 'sdk'], default: 'web' },
    /** Help screen questions, in display order. Empty = the built-in FAQ. */
    faqs: { type: [faqSchema], default: [] },
    /** Policy documents. A missing document falls back to the built-in text. */
    legalDocs: {
      terms: { type: legalDocSchema, default: undefined },
      refund: { type: legalDocSchema, default: undefined },
      privacy: { type: legalDocSchema, default: undefined },
      /** Shipping & delivery (digital) — public website only. */
      delivery: { type: legalDocSchema, default: undefined },
      /** Account & data deletion — the public /delete-account page. */
      deletion: { type: legalDocSchema, default: undefined },
      /** About us — public website only. */
      about: { type: legalDocSchema, default: undefined },
    },
    /** Business and grievance details for the public pages and policies. */
    business: { type: businessSchema, default: undefined },
    /** Lines shown on the checkout screen. Empty = the built-in list. */
    purchaseTerms: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);

export async function getSettings() {
  return Settings.findById('app');
}
