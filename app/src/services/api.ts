/**
 * HTTP client for the YDU Academy server (see /server in the repo).
 *
 * One base URL — set EXPO_PUBLIC_API_URL to point elsewhere (device builds need the LAN
 * IP of the machine running the server; emulators can use http://localhost:5000).
 * Every endpoint the app uses lives in the `api` object at the bottom so screens never
 * build URLs themselves.
 */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');
/** Same origin serves the socket.io realtime endpoint. */
export const SOCKET_URL = API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
  /** No network / server down — the app shows its "can't reach the academy" state. */
  get isOffline() {
    return this.status === 0;
  }
}

let authToken: string | null = null;

/** The auth service injects the session token here after restoring it. */
export function setApiToken(token: string | null) {
  authToken = token;
}

let onSessionExpired: (() => void) | null = null;

/**
 * The store registers a handler that drops the local session when the server rejects the token
 * (e.g. the account was removed or the database was reseeded). Without it the app keeps sending a
 * dead token and every protected action fails with the same 401.
 */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Uploads skip JSON encoding. */
  formData?: FormData;
}

function queryString(query?: Options['query']) {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, query, formData } = options;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${queryString(query)}`, {
      method,
      headers: {
        ...(formData ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch {
    throw new ApiError(0, 'The academy server is unreachable. Check your connection and try again.');
  }

  if (!response.ok) {
    let message = `Something went wrong (${response.status})`;
    let details: unknown;
    try {
      const data = await response.json();
      message = data.error || message;
      details = data.details;
    } catch {
      /* non-JSON error body */
    }
    if (response.status === 401 && authToken && !path.includes('/otp/')) {
      onSessionExpired?.();
      message = 'Your session has expired. Please sign in again.';
    }
    throw new ApiError(response.status, message, details);
  }

  return (await response.json()) as T;
}

/** Server-side shapes the app consumes (mirrors the Mongoose models). */
export type ServerUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  city?: string;
  goal?: string;
  interests?: string[];
  createdAt: string;
  role: 'user' | 'admin';
};

export type ServerCategory = { _id: string; slug: string; label: string; icon: string; sortOrder: number };

export type ServerIngredient = { item: string; quantity: string };
export type ServerRecipe = {
  title: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: ServerIngredient[];
  steps: string[];
  tips: string[];
};
export type ServerLesson = {
  _id: string;
  title: string;
  description: string;
  /** Public https URL of the lesson video on Backblaze B2; empty = bundled demo clip. */
  /** Object key of the course video in private storage; the app gets a signed link from the server. */
  videoKey?: string;
  minutes: number;
  durationSec?: number;
  isPreview: boolean;
  previewSec?: number;
  recipe?: ServerRecipe | null;
};

export type ServerCourse = {
  _id: string;
  slug: string;
  title: string;
  promise: string;
  description: string;
  coverUrl: string;
  category: ServerCategory;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
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
  lessons: ServerLesson[];
  lessonCount: number;
  totalMinutes: number;
  hours?: number;
  enrollmentCount?: number;
};

export type ServerOrder = {
  _id: string;
  course: { _id: string; slug: string; title: string } | null;
  courseTitle: string;
  amountInr: number;
  listAmountInr?: number;
  couponCode?: string;
  discountInr: number;
  status: 'pending' | 'paid' | 'refunded';
  createdAt: string;
};

/** What the app needs to open Razorpay Checkout. The key id is public; the secret never leaves the server. */
export type RazorpayOrderConfig = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
};

export type ServerEnrollment = {
  _id: string;
  course: { _id: string; slug: string; title: string; priceInr: number } | null;
  completedLessons: string[];
  lastLessonId: string;
  lastPositionSeconds: number;
  createdAt: string;
};

export type ServerReview = {
  _id: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type ServerSettings = {
  appName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  maintenanceMode: boolean;
  minAppVersion: string;
  /** Poster slider on the home screen; empty = featured courses. */
  homeBanners?: { imageUrl: string; title: string; subtitle: string; courseSlug: string; active: boolean }[];
  /** 'web' = Razorpay hosted page in the browser (works in Expo Go); 'sdk' = native SDK (dev build). */
  checkoutMode?: 'web' | 'sdk';
};

export const api = {
  // ---- auth ----
  /** Sends a one-time code to an Indian mobile (+91). The server returns the resend wait. */
  requestOtp: (phone: string) =>
    request<{ ok: boolean; expiresInSeconds: number; resendInSeconds: number }>('/api/auth/otp/request', {
      method: 'POST',
      body: { phone },
    }),
  /** Checks the code; a number seen for the first time gets a learner account. */
  verifyOtp: (phone: string, code: string) =>
    request<{ token: string; user: ServerUser }>('/api/auth/otp/verify', {
      method: 'POST',
      body: { phone, code },
    }),
  me: () => request<{ user: ServerUser }>('/api/auth/me'),
  updateMe: (patch: Partial<Pick<ServerUser, 'name' | 'phone' | 'avatarUrl' | 'dateOfBirth' | 'city' | 'goal' | 'interests'>>) =>
    request<{ user: ServerUser }>('/api/users/me', { method: 'PATCH', body: patch }),

  // ---- catalog ----
  categories: () => request<{ categories: ServerCategory[] }>('/api/categories'),
  courses: (query?: { q?: string; category?: string; level?: string }) =>
    request<{ courses: ServerCourse[] }>('/api/courses', { query }),
  course: (idOrSlug: string) => request<{ course: ServerCourse }>(`/api/courses/${idOrSlug}`),
  relatedCourses: (idOrSlug: string) =>
    request<{ courses: ServerCourse[] }>(`/api/courses/${idOrSlug}/related`),

  // ---- analytics (fire-and-forget batch of behaviour events) ----
  trackEvents: (events: { event: string; courseId?: string; meta?: Record<string, unknown>; at: number }[]) =>
    request<{ ok: boolean }>('/api/analytics/events', { method: 'POST', body: { events } }),

  // ---- settings ----
  settings: () => request<{ settings: ServerSettings }>('/api/settings'),

  // ---- checkout ----
  validateCoupon: (code: string, courseId: string) =>
    request<{ coupon: { code: string; type: string; value: number }; discountInr: number; finalPriceInr: number }>(
      '/api/coupons/validate',
      { method: 'POST', body: { code, courseId } },
    ),
  /** Prices the course on the server and opens a Razorpay order for the checkout sheet. */
  createRazorpayOrder: (input: { courseId: string; couponCode?: string }) =>
    request<{ order: ServerOrder; razorpay: RazorpayOrderConfig }>('/api/payments/razorpay/order', {
      method: 'POST',
      body: input,
    }),
  /** Short-lived, signed playback link for a lesson video. Enrolled learners, or any learner for a free preview. */
  /** `quality` picks one uploaded version (360/480/720/1080); omitted = best available. */
  lessonVideoUrl: (courseId: string, lessonId: string, quality?: string) =>
    request<{ url: string; expiresIn: number; quality: string; qualities: string[] }>(
      `/api/courses/${courseId}/lessons/${lessonId}/video`,
      { query: { quality } },
    ),
  /** Prices the course and creates a Razorpay Payment Link; the app opens `paymentLink.url` in the browser. */
  createRazorpayPaymentLink: (input: { courseId: string; couponCode?: string }) =>
    request<{ order: ServerOrder; paymentLink: { id: string; url: string } }>('/api/payments/razorpay/link', {
      method: 'POST',
      body: input,
    }),
  /** Checks whether the payment link was paid; the server grants the course when it was. */
  razorpayLinkStatus: (orderId: string) =>
    request<{ status: 'paid' | 'pending' | 'cancelled' | 'expired'; order: ServerOrder }>(
      `/api/payments/razorpay/link/${orderId}`,
    ),
  /** Confirms a successful checkout with the server, which grants the course. */
  verifyRazorpayPayment: (input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    request<{ order: ServerOrder }>('/api/payments/razorpay/verify', { method: 'POST', body: input }),
  myOrders: () => request<{ orders: ServerOrder[] }>('/api/orders/my'),

  // ---- learning ----
  myEnrollments: () => request<{ enrollments: ServerEnrollment[] }>('/api/enrollments/my'),
  saveProgress: (courseId: string, progress: { completedLessons: string[]; lastLessonId: string; lastPositionSeconds: number }) =>
    request<{ enrollment: ServerEnrollment }>(`/api/enrollments/${courseId}/progress`, {
      method: 'PATCH',
      body: progress,
    }),

  // ---- reviews ----
  courseReviews: (courseId: string) => request<{ reviews: ServerReview[] }>(`/api/courses/${courseId}/reviews`),
  submitReview: (courseId: string, rating: number, body: string) =>
    request<{ review: ServerReview }>(`/api/courses/${courseId}/reviews`, {
      method: 'POST',
      body: { rating, body },
    }),

  // ---- uploads ----
  uploadImage: async (uri: string, fileName: string) => {
    const formData = new FormData();
    // React Native's FormData accepts { uri, name, type } objects for file parts.
    formData.append('file', {
      uri,
      name: fileName,
      type: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
    } as unknown as Blob);
    return request<{ url: string; publicId: string; provider: string }>('/api/uploads', {
      method: 'POST',
      formData,
    });
  },
};
