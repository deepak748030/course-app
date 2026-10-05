import type { ImageSource } from 'expo-image';

/** Everything in src/data is sample content for the prototype, not verified fact. */
export type Id = string;

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type Language = 'English' | 'Hindi' | 'English + Hindi';
export type VideoKey = 'home-cooking' | 'gravies' | 'baking' | 'foundations';

export interface Instructor {
  id: Id;
  name: string;
  portrait: ImageSource;
  headline: string;
  bio: string;
  city: string;
  yearsTeaching: number;
  expertise: string[];
  teachingStyle: string;
  languages: Language[];
  /** Sample data flag — badges in the UI must be driven by this, never invented. */
  verified: boolean;
}

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
  sectionId: Id;
  title: string;
  description: string;
  minutes: number;
  isPreview: boolean;
  video: VideoKey;
  recipe?: Recipe;
}

export interface CurriculumSection {
  id: Id;
  title: string;
  summary: string;
}

export interface Review {
  id: Id;
  author: string;
  rating: number;
  body: string;
  /** e.g. "Completed Baking Basics" — sample content. */
  context: string;
}

export interface Course {
  id: Id;
  title: string;
  promise: string;
  description: string;
  instructorId: Id;
  cover: ImageSource;
  video: VideoKey;
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
  sections: CurriculumSection[];
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
  /** 'sample-seed' = demo account progress, 'demo-checkout' = bought in this prototype. */
  source: 'sample-seed' | 'demo-checkout';
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
  kind: 'course-update' | 'learning-reminder' | 'instructor' | 'product';
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
