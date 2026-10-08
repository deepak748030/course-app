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
}

export interface Section {
  _id?: string;
  title: string;
  summary: string;
  lessons: Lesson[];
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
  sections: Section[];
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
