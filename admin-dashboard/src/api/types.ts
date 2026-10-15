/** Shared API types — mirror the Mongoose models on the server. */

export type Role = 'user' | 'admin';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type OrderStatus = 'pending' | 'paid' | 'refunded';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  blocked: boolean;
  createdAt: string;
  lastLoginAt?: string;
  enrollmentCount?: number;
  totalSpentInr?: number;
}

export interface Category {
  _id: string;
  slug: string;
  label: string;
  icon: string;
  sortOrder: number;
  courseCount?: number;
}

export interface Lesson {
  _id?: string;
  title: string;
  description: string;
  minutes: number;
  isPreview: boolean;
  /** Seconds anyone may watch without buying; 0 = locked. */
  previewSec?: number;
  /** Object key of the uploaded course video in the private B2 bucket. Empty = no video yet. */
  videoKey?: string;
  /** Encoded versions of the lesson video, one per quality. */
  videos?: LessonVideo[];
  /** Exact length of the video in seconds, read when it was uploaded. */
  durationSec?: number;
}

export type VideoQuality = '360' | '480' | '720' | '1080';

export interface LessonVideo {
  quality: VideoQuality;
  videoKey: string;
}


export interface Course {
  _id: string;
  slug: string;
  title: string;
  promise: string;
  description: string;
  coverUrl: string;
  category: Category | string;
  level: Level;
  language: string;
  priceInr: number;
  listPriceInr?: number | null;
  published: boolean;
  isPopular: boolean;
  isBeginnerPick: boolean;
  rating: number;
  reviewCount: number;
  outcomes: string[];
  equipment: string[];
  audience: string;
  lessons: Lesson[];
  createdAt?: string;
  enrollmentCount?: number;
  lessonCount?: number;
  totalMinutes?: number;
}

export interface Review {
  _id: string;
  course: { _id: string; title: string; slug: string } | string;
  user: { _id: string; name: string; email: string } | null;
  author: string;
  rating: number;
  body: string;
  visible: boolean;
  createdAt: string;
}

export interface Order {
  _id: string;
  user: { _id: string; name: string; email: string } | null;
  course: { _id: string; title: string } | null;
  courseTitle: string;
  amountInr: number;
  listAmountInr?: number;
  couponCode?: string;
  discountInr: number;
  status: OrderStatus;
  paymentMethod: string;
  /** Razorpay payment id (pay_…), set once the payment is confirmed. */
  paymentReference?: string;
  /** Razorpay order id (order_…). */
  razorpayOrderId?: string;
  /** Razorpay Payment Link id (plink_…), for purchases made on the hosted page. */
  paymentLinkId?: string;
  createdAt: string;
}

export type NotificationKind = 'announcement' | 'course-update' | 'learning-reminder' | 'product';

/** A message the academy sent: the inbox entry plus how the push went. */
export interface AdminNotification {
  _id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  audience: 'all' | 'user';
  user: { _id: string; name: string; email: string } | null;
  course: { _id: string; title: string; slug: string } | null;
  pushStatus: 'queued' | 'sending' | 'sent' | 'failed' | 'no-devices';
  pushDevices: number;
  pushFailed: number;
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string | null;
  active: boolean;
  createdAt?: string;
}

export interface AppSettings {
  appName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  maintenanceMode: boolean;
  minAppVersion: string;
  /** Server URL the app uses. Empty = the URL the app was built with. */
  apiBaseUrl: string;
  homeBanners: HomeBanner[];
  /** 'web' = Razorpay hosted page in the phone browser (works in Expo Go); 'sdk' = native SDK (dev build). */
  checkoutMode: 'web' | 'sdk';
  /** Help questions in the app, in order. Empty = the app's built-in FAQ. */
  faqs?: FaqEntry[];
  /** Policy and information documents. A null/missing document shows the built-in text. */
  legalDocs?: Partial<Record<LegalDocKey, LegalDocEntry | null>>;
  /** Checkout lines in the app. Empty = the built-in list. */
  purchaseTerms?: string[];
  /** Who runs the academy — shown on the public Contact page and filled into the policies. */
  business?: Partial<BusinessDetails>;
}

/**
 * The documents the academy publishes. terms / refund / privacy are also shown inside the app;
 * delivery, deletion and about live on the public website only.
 */
export type LegalDocKey = 'terms' | 'privacy' | 'refund' | 'delivery' | 'deletion' | 'about';

/** Business and grievance details. Every field is optional; empty ones are left out of the pages. */
export interface BusinessDetails {
  legalName: string;
  address: string;
  gstin: string;
  supportHours: string;
  grievanceName: string;
  grievanceEmail: string;
  grievancePhone: string;
  jurisdiction: string;
  websiteUrl: string;
}

/** The built-in text shown until the admin writes their own. */
export interface ContentDefaults {
  faqs: FaqEntry[];
  legalDocs: Record<LegalDocKey, LegalDocEntry>;
  purchaseTerms: string[];
  /** Display order of the documents. */
  legalDocKeys?: LegalDocKey[];
  /** When the built-in documents were last revised (ISO date). */
  updatedAt?: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface LegalSectionEntry {
  heading: string;
  body: string[];
  points: string[];
}

export interface LegalDocEntry {
  title: string;
  heading: string;
  summary: string;
  sections: LegalSectionEntry[];
  /** Set by the server whenever the text changes (ISO). */
  updatedAt?: string;
}

/** A request to delete an account — from the public /delete-account page or from the app itself. */
export type DeletionRequestStatus = 'pending' | 'completed' | 'rejected';

/** What deleting an account removed (and how many paid orders stayed as the tax record). */
export interface AccountDeletionSummary {
  enrollments: number;
  reviews: number;
  pendingOrders: number;
  keptOrders: number;
}

export interface DeletionRequest {
  _id: string;
  reference: string;
  /** Full 10-digit number while open; masked (XXXXXX3210) once closed. */
  phone: string;
  name: string;
  reason: string;
  details: string;
  source: 'web' | 'app';
  status: DeletionRequestStatus;
  accountDeleted: boolean;
  note: string;
  handledBy: { _id: string; name: string; email: string } | null;
  closedAt: string | null;
  createdAt: string;
  /** The account this number opens (open requests only); null = no account uses the number. */
  account: {
    _id: string;
    name: string;
    role: 'user' | 'admin';
    blocked: boolean;
    avatarUrl?: string;
    createdAt: string;
    lastLoginAt?: string;
    enrollmentCount: number;
    paidOrders: number;
    totalPaidInr: number;
  } | null;
}

/** A poster on the app's home screen. Empty imageUrl = the linked course's cover. */
export interface HomeBanner {
  imageUrl: string;
  title: string;
  subtitle: string;
  courseSlug: string;
  active: boolean;
}

export interface Overview {
  kpis: {
    revenue30: number;
    revenueDelta: number;
    orders30: number;
    ordersDelta: number;
    newUsers30: number;
    newUsersDelta: number;
    enrollments30: number;
    enrollmentsDelta: number;
    totalUsers: number;
    totalCourses: number;
    publishedCourses: number;
    avgRating: number;
  };
  revenueSeries: { date: string; revenue: number; orders: number }[];
  enrollmentSeries: { date: string; enrollments: number }[];
  topCourses: {
    id: string;
    title: string;
    coverUrl: string;
    rating: number;
    priceInr: number;
    published: boolean;
    enrollments30: number;
    revenue30: number;
  }[];
  ratingDistribution: { stars: number; count: number }[];
  categoryBreakdown: { label: string; courses: number; enrollments30: number }[];
  recentOrders: {
    id: string;
    courseTitle: string;
    user: { name: string; email: string } | null;
    amountInr: number;
    status: OrderStatus;
    createdAt: string;
  }[];
  recentUsers: { _id: string; name: string; email: string; createdAt: string }[];
}

export interface EnrollmentDetail {
  _id: string;
  course: { _id: string; title: string; slug: string; priceInr: number } | null;
  completedLessons: string[];
  createdAt: string;
}

export interface UserDetail {
  user: AdminUser;
  enrollments: EnrollmentDetail[];
  orders: Order[];
}

// ---------- behaviour analytics ----------------------------------------------------
export interface AnalyticsDay {
  date: string;
  label: string;
  requests: number;
  uniques: number;
  courseViews: number;
  checkouts: number;
  lessonStarts: number;
  purchases: number;
  revenueInr: number;
}

export interface AnalyticsOverview {
  periodDays: number;
  kpis: {
    requests: { total: number; today: number };
    activeUsers: { dau: number; wau: number; mau: number };
    signups: { total: number; today: number };
    orders: { count: number; revenueInr: number; today: { count: number; revenueInr: number } };
  };
  daily: AnalyticsDay[];
  funnel: { courseViews: number; checkoutStarted: number; ordersPaid: number; conversionPct: number };
  peakHours: Array<{ hour: number; count: number }>;
  topViewed: Array<{ id: string; slug: string; title: string; count: number }>;
  topPurchased: Array<{ id: string; slug: string; title: string; count: number; revenueInr: number }>;
  topSearches: Array<{ query: string; count: number }>;
}
