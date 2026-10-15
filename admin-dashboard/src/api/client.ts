/**
 * API client for the YDU Academy server.
 *
 * There is no dev-server proxy: every request goes straight to the backend whose
 * URL is set in .env as VITE_API_URL (e.g. VITE_API_URL=http://localhost:5000 or
 * https://api.example.com — without a trailing /api).
 */

import type {
  AccountDeletionSummary,
  AdminUser,
  AnalyticsOverview,
  AppSettings,
  Category,
  ContentDefaults,
  Coupon,
  Course,
  Overview,
  Review,
  UserDetail,
  Order,
  AdminNotification,
  NotificationKind,
  DeletionRequest,
  DeletionRequestStatus,
} from './types';

/**
 * Base URL of the backend server, from .env (VITE_API_URL). A trailing slash or
 * a trailing /api in the value is tolerated. Falls back to the local dev server
 * so a fresh checkout still works without a .env file.
 */
export const SERVER_URL = ((import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:5000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

/** Absolute URL for an API path such as '/admin/courses'. */
export const apiUrl = (path: string) => `${SERVER_URL}/api${path}`;

/**
 * The server returns paths like /uploads/<file> for locally stored images.
 * Those live on the server, not on this dashboard's host, so resolve them
 * against SERVER_URL. Absolute http(s)/data/blob URLs pass through untouched.
 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  return url.startsWith('/') ? `${SERVER_URL}${url}` : url;
}

const TOKEN_KEY = 'ydu.admin.token';

// Clean up any stale demo database or demo tokens from prior demo-mode usage
try {
  localStorage.removeItem('ydu-admin-demo-db-v1');
  if (localStorage.getItem(TOKEN_KEY) === 'demo-token') {
    localStorage.removeItem(TOKEN_KEY);
  }
} catch {
  /* storage unavailable */
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(cb: () => void) {
  unauthorizedListeners.add(cb);
  return () => unauthorizedListeners.delete(cb);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function queryString(query?: RequestOptions['query']) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;

  let res: Response;
  try {
    res = await fetch(apiUrl(`${path}${queryString(query)}`), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the server. Please check your connection or ensure the server is running.');
  }

  if (res.status === 401) {
    unauthorizedListeners.forEach((cb) => cb());
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: unknown;
    try {
      const data = await res.json();
      message = data.error || message;
      details = data.details;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, message, details);
  }

  return res.json() as Promise<T>;
}

/** Video storage status: whether Backblaze B2 is set up on the server, and the upload limits. */
export const videoStorageStatus = () =>
  request<{ configured: boolean; maxBytes: number; types: string[] }>('/admin/uploads/video/status');

/**
 * Uploads one lesson video to the server, which streams it into the private Backblaze B2 bucket.
 * Resolves with the object key, which the lesson stores (the app gets a signed playback link).
 * `onProgress` reports the browser → server upload; the server's own B2 step follows it.
 */
/**
 * Two real stages, each with its own exact percentage:
 *  - 'sending': the file's bytes leaving this browser for the server (XHR upload progress).
 *  - 'storing': the server copying the file to Backblaze B2, read back from its progress endpoint.
 */
export type VideoUploadProgress = { stage: 'sending' | 'storing'; percent: number };

export async function uploadCourseVideo(
  file: File,
  courseId: string | undefined,
  quality: string,
  onProgress: (progress: VideoUploadProgress) => void
): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  if (courseId) body.append('courseId', courseId);
  body.append('quality', quality);

  const uploadId = crypto.randomUUID();
  const token = getToken();

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let poll: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    xhr.open('POST', apiUrl('/admin/uploads/video'));
    xhr.setRequestHeader('X-Upload-Id', uploadId);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress({ stage: 'sending', percent: Math.round((event.loaded / event.total) * 100) });
    };
    // The whole file is in the server's hands now; the B2 copy is the slow part, so ask for its progress.
    xhr.upload.onload = () => {
      onProgress({ stage: 'storing', percent: 0 });
      poll = setInterval(async () => {
        try {
          const res = await fetch(apiUrl(`/admin/uploads/video/progress/${uploadId}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) return;
          const entry = (await res.json()) as { stage: string; sent?: number; total?: number };
          if (entry.stage === 'storing' && entry.total) {
            onProgress({ stage: 'storing', percent: Math.min(100, Math.round(((entry.sent ?? 0) / entry.total) * 100)) });
          }
        } catch {
          /* a missed poll is retried on the next tick */
        }
      }, 400);
    };
    xhr.onload = () => {
      stopPolling();
      let data: { key?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* not json */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.key) resolve(data.key);
      else reject(new ApiError(xhr.status, data.error || `Video upload failed (${xhr.status})`));
    };
    xhr.onerror = () => {
      stopPolling();
      reject(new ApiError(0, 'Could not reach the server for the video upload.'));
    };
    xhr.send(body);
  });
}

/**
 * Multipart image upload (cover art, anything the dashboard needs hosted).
 * Goes straight to the server's /api/uploads (on SERVER_URL); returns the stored URL.
 */
export async function uploadImage(file: File, folder = 'covers'): Promise<{ url: string; provider: string }> {
  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);
  let res: Response;
  try {
    res = await fetch(apiUrl('/uploads'), {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server for the upload.');
  }
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      message = (await res.json()).error || message;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, message);
  }
  return res.json();
}

// ---------- typed surface -------------------------------------------------------------
export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AdminUser }>('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request<{ user: AdminUser }>('/auth/me'),

  overview: () => request<Overview>('/admin/stats/overview'),
  analyticsOverview: (days: number) =>
    request<AnalyticsOverview>('/admin/analytics/overview', { query: { days } }),

  listCourses: (params: { search?: string; category?: string; published?: string; sort?: string }) =>
    request<{ courses: Course[] }>('/admin/courses', { query: params }).then((r) => r.courses),
  createCourse: (data: Partial<Course>) =>
    request<{ course: Course }>('/admin/courses', { method: 'POST', body: data }).then((r) => r.course),
  updateCourse: (id: string, data: Partial<Course>) =>
    request<{ course: Course }>(`/admin/courses/${id}`, { method: 'PUT', body: data }).then((r) => r.course),
  publishCourse: (id: string, published: boolean) =>
    request<{ course: Course }>(`/admin/courses/${id}/publish`, { method: 'PATCH', body: { published } }).then(
      (r) => r.course
    ),
  deleteCourse: (id: string) => request<{ ok: boolean }>(`/admin/courses/${id}`, { method: 'DELETE' }),

  listCategories: () =>
    request<{ categories: Category[] }>('/admin/categories').then((r) => r.categories),
  createCategory: (data: Partial<Category>) =>
    request<{ category: Category }>('/admin/categories', { method: 'POST', body: data }).then((r) => r.category),
  updateCategory: (id: string, data: Partial<Category>) =>
    request<{ category: Category }>(`/admin/categories/${id}`, { method: 'PUT', body: data }).then((r) => r.category),
  deleteCategory: (id: string) => request<{ ok: boolean }>(`/admin/categories/${id}`, { method: 'DELETE' }),

  /** History of messages the academy sent, plus how many devices can receive a push. */
  listNotifications: () =>
    request<{ notifications: AdminNotification[]; devices: number; learnersWithDevices: number }>('/admin/notifications'),
  /** Saves a message to the learner inbox(es) and pushes it to their devices. */
  sendNotification: (data: { audience: 'all' | 'user'; userId?: string; title: string; body: string; kind: NotificationKind; courseId?: string }) =>
    request<{ notification: AdminNotification }>('/admin/notifications', { method: 'POST', body: data }).then((r) => r.notification),

  listUsers: (params: { search?: string; role?: string; blocked?: string }) =>
    request<{ users: AdminUser[] }>('/admin/users', { query: params }).then((r) => r.users),
  getUser: (id: string) => request<UserDetail>(`/admin/users/${id}`),
  updateUser: (id: string, data: Partial<AdminUser>) =>
    request<{ user: AdminUser }>(`/admin/users/${id}`, { method: 'PATCH', body: data }).then((r) => r.user),
  deleteUser: (id: string) =>
    request<{ ok: boolean; deleted?: string; summary?: AccountDeletionSummary }>(`/admin/users/${id}`, { method: 'DELETE' }),

  listOrders: (params: { status?: string; search?: string }) =>
    request<{ orders: Order[]; totals: { count: number; paid: number; discounts: number } }>('/admin/orders', {
      query: params,
    }),
  updateOrder: (id: string, status: string) =>
    request<{ order: Order }>(`/admin/orders/${id}`, { method: 'PATCH', body: { status } }).then((r) => r.order),

  listReviews: (params: { visible?: string }) =>
    request<{ reviews: Review[] }>('/admin/reviews', { query: params }).then((r) => r.reviews),
  updateReview: (id: string, data: { visible: boolean }) =>
    request<{ review: Review }>(`/admin/reviews/${id}`, { method: 'PATCH', body: data }).then((r) => r.review),
  deleteReview: (id: string) => request<{ ok: boolean }>(`/admin/reviews/${id}`, { method: 'DELETE' }),

  listCoupons: () => request<{ coupons: Coupon[] }>('/admin/coupons').then((r) => r.coupons),
  createCoupon: (data: Partial<Coupon>) =>
    request<{ coupon: Coupon }>('/admin/coupons', { method: 'POST', body: data }).then((r) => r.coupon),
  updateCoupon: (id: string, data: Partial<Coupon>) =>
    request<{ coupon: Coupon }>(`/admin/coupons/${id}`, { method: 'PUT', body: data }).then((r) => r.coupon),
  deleteCoupon: (id: string) => request<{ ok: boolean }>(`/admin/coupons/${id}`, { method: 'DELETE' }),

  getSettings: () => request<{ settings: AppSettings }>('/admin/settings').then((r) => r.settings),
  /** Settings plus the built-in content defaults, for the Content page. */
  getSettingsWithDefaults: () =>
    request<{ settings: AppSettings; contentDefaults?: ContentDefaults }>('/admin/settings'),
  updateSettings: (data: Partial<AppSettings>) =>
    request<{ settings: AppSettings }>('/admin/settings', { method: 'PUT', body: data }).then((r) => r.settings),
  /** Changes the admin's login (username = email) and/or password. The current password is always required. */
  updateAccount: (data: { email?: string; currentPassword: string; newPassword?: string }) =>
    request<{ user: { email: string } }>('/admin/account', { method: 'PATCH', body: data }),

  /** Account deletion requests from the public /delete-account page (and the record of in-app deletions). */
  listDeletionRequests: (status: DeletionRequestStatus | 'all') =>
    request<{ requests: DeletionRequest[]; counts: Record<DeletionRequestStatus, number> }>('/admin/deletion-requests', {
      query: { status },
    }),
  /** Close a request: completed (optionally deleting the account the number opens) or rejected. */
  updateDeletionRequest: (id: string, data: { status: 'completed' | 'rejected'; deleteAccount?: boolean; note?: string }) =>
    request<{
      request: DeletionRequest;
      deleted: AccountDeletionSummary | null;
    }>(`/admin/deletion-requests/${id}`, { method: 'PATCH', body: data }),
};

// ---------- public website (no sign-in) ------------------------------------------------
/**
 * Requests made by the public pages (/privacy-policy, /delete-account …). They never send the admin
 * token and never trigger the sign-out listeners: a visitor is not an admin session. A timeout keeps a
 * sleeping server (free hosting cold start) from leaving a policy page blank — the page falls back to
 * the built-in text instead.
 */
async function publicRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'We could not reach our server. Check your internet connection and try again.');
  } finally {
    window.clearTimeout(timer);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: unknown;
    try {
      const data = await res.json();
      message = data.error || message;
      details = data.details;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, message, details);
  }
  return res.json() as Promise<T>;
}

/** A course as the public catalog sends it (published courses only). */
export interface PublicCourse {
  _id: string;
  slug: string;
  title: string;
  promise: string;
  coverUrl: string;
  level: string;
  language: string;
  priceInr: number;
  listPriceInr?: number | null;
  lessonCount: number;
  hours?: number;
  rating: number;
  reviewCount: number;
  category: { slug: string; label: string } | null;
}

export const publicApi = {
  /** App settings + the built-in documents. Same data the mobile app reads. */
  content: () =>
    publicRequest<{ settings: AppSettings | null; contentDefaults?: ContentDefaults }>('/settings', { timeoutMs: 12000 }),
  courses: () => publicRequest<{ courses: PublicCourse[] }>('/courses', { timeoutMs: 20000 }).then((r) => r.courses),
  /** The public account-deletion request form. Never says whether an account exists. */
  requestDeletion: (data: { phone: string; name?: string; reason?: string; details?: string; confirm: true; company?: string }) =>
    publicRequest<{ ok: boolean; reference: string; status: string; createdAt: string; duplicate?: boolean }>(
      '/account-deletion',
      { method: 'POST', body: data, timeoutMs: 30000 }
    ),
};
