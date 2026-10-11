/**
 * API client for the YDU Academy server.
 *
 * All requests go to /api (proxied to the Express server by Vite in dev). When the
 * server or its database is unreachable, the client transparently falls back to the
 * in-browser demo store so the dashboard stays usable — the layout shows a banner
 * while demo mode is active.
 */

import { DemoApiError, demoRequest } from './demo';
import type {
  AdminUser,
  AnalyticsOverview,
  AppSettings,
  Category,
  Coupon,
  Course,
  Overview,
  Review,
  UserDetail,
  Order,
} from './types';

const TOKEN_KEY = 'ydu.admin.token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

let demoMode = false;
const demoListeners = new Set<(on: boolean) => void>();

export const isDemoMode = () => demoMode;
export function onDemoModeChange(cb: (on: boolean) => void) {
  demoListeners.add(cb);
  return () => demoListeners.delete(cb);
}
function setDemoMode(on: boolean) {
  if (demoMode !== on) {
    demoMode = on;
    demoListeners.forEach((cb) => cb(on));
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

  if (demoMode) {
    try {
      return demoRequest(method, path + queryString(query), body) as T;
    } catch (err) {
      if (err instanceof DemoApiError) throw new ApiError(err.status, err.message);
      throw err;
    }
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}${queryString(query)}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Server unreachable → demo mode.
    setDemoMode(true);
    return request<T>(path, options);
  }

  // Database down (the server answers 503 from dbGuard) → demo mode.
  if (res.status === 503) {
    setDemoMode(true);
    return request<T>(path, options);
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
export async function uploadCourseVideo(
  file: File,
  courseId: string | undefined,
  quality: string,
  onProgress: (percent: number) => void
): Promise<string> {
  if (demoMode) throw new ApiError(503, 'Video uploads need the real server — demo mode cannot store files.');
  const body = new FormData();
  body.append('file', file);
  if (courseId) body.append('courseId', courseId);
  body.append('quality', quality);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/uploads/video');
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let data: { key?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* not json */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.key) resolve(data.key);
      else reject(new ApiError(xhr.status, data.error || `Video upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Could not reach the server for the video upload.'));
    xhr.send(body);
  });
}

/**
 * Multipart image upload (cover art, anything the dashboard needs hosted).
 * Goes straight to the server's /api/uploads; returns the stored URL.
 */
export async function uploadImage(file: File, folder = 'covers'): Promise<{ url: string; provider: string }> {
  if (demoMode) throw new ApiError(503, 'Uploads need the real server — demo mode cannot store files.');
  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);
  let res: Response;
  try {
    res = await fetch('/api/uploads', {
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

  listUsers: (params: { search?: string; role?: string; blocked?: string }) =>
    request<{ users: AdminUser[] }>('/admin/users', { query: params }).then((r) => r.users),
  getUser: (id: string) => request<UserDetail>(`/admin/users/${id}`),
  updateUser: (id: string, data: Partial<AdminUser>) =>
    request<{ user: AdminUser }>(`/admin/users/${id}`, { method: 'PATCH', body: data }).then((r) => r.user),
  deleteUser: (id: string) => request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),

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
  updateSettings: (data: Partial<AppSettings>) =>
    request<{ settings: AppSettings }>('/admin/settings', { method: 'PUT', body: data }).then((r) => r.settings),
};
