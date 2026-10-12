import type { ImageSource } from 'expo-image';

/** Everything in src/data is sample content for the prototype, not verified fact. */
export type Id = string;

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type Language = 'English' | 'Hindi' | 'English + Hindi';

export interface Ingredient {
  item: string;
  quantity: string;
}

export interface Recipe {
  id: Id;
  title: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: Ingredient[];
  steps: string[];
  tips: string[];
}

export interface Lesson {
  id: Id;
  courseId: Id;
  title: string;
  description: string;
  minutes: number;
  /** Exact length in seconds when the lesson's video was measured on upload. */
  seconds?: number;
  isPreview: boolean;
  /** Seconds anyone may watch without buying. Unset on older lessons: then the whole lesson is free when `isPreview`. */
  previewSec?: number;
  /** The lesson has its own video in private storage (fetched as a signed link). Without one, nothing plays. */
  hasCourseVideo?: boolean;
  recipe?: Recipe;
}

export interface Review {
  id: Id;
  author: string;
  rating: number;
  body: string;
  /** e.g. "Completed Baking Basics" — sample content. */
  context: string;
}

/**
 * A rating the learner gave a course they own.
 *
 * Prototype data: it is written to this device and never sent anywhere, which is what the screen says
 * out loud rather than pretending a server collected it.
 */
export interface CourseRating {
  courseId: Id;
  /** 1 to 5. */
  stars: number;
  /** What stood out, from the fixed list of highlights. */
  highlights: string[];
  /** Optional written review. */
  body: string;
  /** ISO timestamp: the rating can be edited, so the screen shows when it was last saved. */
  updatedAt: string;
}

export interface Course {
  id: Id;
  /** The server's Mongo id — used for checkout, coupons and reviews. */
  remoteId: Id;
  title: string;
  promise: string;
  description: string;
  cover: ImageSource;
  categoryId: Id;
  level: Level;
  language: Language;
  hours: number;
  lessonCount: number;
  priceInr: number;
  /** Only set when the sample dataset models a real discount. */
  listPriceInr?: number;
  rating: number;
  reviewCount: number;
  outcomes: string[];
  equipment: string[];
  audience: string;
  lessons: Lesson[];
  reviews: Review[];
  isPopular?: boolean;
  isBeginnerPick?: boolean;
}

export interface Category {
  id: Id;
  label: string;
  /** Lucide icon name used by the UI. */
  icon: string;
}

export interface Interest extends Category {}

export interface Enrollment {
  courseId: Id;
  purchasedAt: string;
  priceInr: number;
  /** 'server' = purchased through the YDU API, 'demo-checkout' = legacy local purchase. */
  source: 'server' | 'demo-checkout';
  /** Demo coupon that was applied at checkout, if any. Shown on the transactions list. */
  couponCode?: string;
}

export interface LessonProgress {
  completed: boolean;
  /** Last playback position in seconds, restored when the lesson reopens. */
  positionSec: number;
}

export interface CourseProgress {
  scope: Record<Id, LessonProgress>;
}

export interface NotificationItem {
  id: Id;
  kind: 'course-update' | 'learning-reminder' | 'product';
  title: string;
  body: string;
  minutesAgo: number;
  courseId?: Id;
}

export interface FaqItem {
  id: Id;
  question: string;
  answer: string;
}

export interface UserProfile {
  id: Id;
  name: string;
  phone: string;
  joinedAt: string;
  /* Optional: the user fills these in from Profile -> Edit. */
  email?: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  dateOfBirth?: string;
  city?: string;
  /** Short cooking goal picked from a fixed list — see profile editor. */
  goal?: string;
  /** Avatar stored on the server (Cloudinary/local upload). */
  avatarUrl?: string;
  /** Category slugs picked on the interests step — synced to the server. */
  interests?: string[];
}

export interface Session {
  token: string;
  profile: UserProfile;
}

export interface NotificationPrefs {
  courseUpdates: boolean;
  learningReminders: boolean;
  productNews: boolean;
}
