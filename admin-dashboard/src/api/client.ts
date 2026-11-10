/**
 * API client for the YDU Academy server.
 *
 * Default server URL comes from `.env` (`VITE_API_URL`, falling back to
 * `http://localhost:5000`), and can also be switched instantly at runtime from
 * the Login screen or Settings (saved in `localStorage` under `ydu.admin.serverUrl`).
 */

import { useSyncExternalStore } from 'react';
import type {
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
} from './types';

const SERVER_URL_KEY = 'ydu.admin.serverUrl';

export const DEFAULT_SERVER_URL = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:5000'
)
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

/** Cleans a user-typed server URL, or returns null when invalid. */
export function normalizeServerUrl(raw?: string | null): string | null {
  const cleaned = (raw ?? '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');
  if (!cleaned) return null;
  return /^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(cleaned) ? cleaned : null;
}

function readStoredServerUrl(): string {
  try {
    const saved = localStorage.getItem(SERVER_URL_KEY);
    return normalizeServerUrl(saved) ?? DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

let activeServerUrl = readStoredServerUrl();
const serverUrlListeners = new Set<() => void>();

/** Active backend base URL (synchronous). */
export const getServerUrl = () => activeServerUrl;

/** True when the browser has a saved override differing from VITE_API_URL. */
export const hasCustomServerUrl = () => {
  try {
    const saved = normalizeServerUrl(localStorage.getItem(SERVER_URL_KEY));
    return Boolean(saved && saved !== DEFAULT_SERVER_URL);
  } catch {
    return false;
  }
};

export function onServerUrlChange(cb: () => void) {
  serverUrlListeners.add(cb);
  return () => {
    serverUrlListeners.delete(cb);
  };
}

/** React hook returning the active backend URL and re-rendering when switched. */
export function useServerUrl(): string {
  return useSyncExternalStore(onServerUrlChange, getServerUrl, getServerUrl);
}

/**
 * Switches the backend URL immediately in this browser (empty string resets to `DEFAULT_SERVER_URL`).
 * Throws if a non-empty URL is malformed.
 */
export function setServerUrl(raw: string): string {
  const trimmed = raw.trim();
  const next = trimmed ? normalizeServerUrl(trimmed) : DEFAULT_SERVER_URL;
  if (!next) {
    throw new Error('Enter a valid URL starting with http:// or https://');
  }
  try {
    if (!trimmed || next === DEFAULT_SERVER_URL) localStorage.removeItem(SERVER_URL_KEY);
    else localStorage.setItem(SERVER_URL_KEY, next);
  } catch {
    /* storage unavailable */
  }
  if (next !== activeServerUrl) {
    activeServerUrl = next;
    serverUrlListeners.forEach((cb) => cb());
  }
  return activeServerUrl;
}

export interface ConnectionTestResult {
  ok: boolean;
  url: string;
  db?: string;
  latencyMs?: number;
  error?: string;
}

/** Checks `/api/health` on any candidate server URL before switching to it. */
export async function testServerConnection(raw: string): Promise<ConnectionTestResult> {
  const normalized = normalizeServerUrl(raw);
  if (!normalized) {
    return { ok: false, url: raw.trim(), error: 'Enter a full URL starting with http:// or https://' };
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 6000);
  const started = performance.now();
  try {
    const res = await fetch(`${normalized}/api/health`, { signal: controller.signal });
    const latencyMs = Math.round(performance.now() - started);
    let body: { ok?: boolean; db?: string; error?: string } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      /* non-json */
    }
    if (!res.ok || body.ok === false) {
      return {
        ok: false,
        url: normalized,
        db: body.db,
        latencyMs,
        error: body.db && body.db !== 'connected' ? `Server reachable, database status: ${body.db}` : `Server answered ${res.status}`,
      };
    }
    return { ok: true, url: normalized, db: body.db ?? 'connected', latencyMs };
  } catch (err) {
    return {
      ok: false,
      url: normalized,
      error: err instanceof DOMException && err.name === 'AbortError' ? 'Connection timed out after 6s' : 'Could not reach this server URL',
    };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Absolute URL for an API path such as '/admin/courses'. */
export const apiUrl = (path: string) => `${activeServerUrl}/api${path}`;

/**
 * Resolves stored media URLs against the active server URL:
 * - Relative `/uploads/...` paths prepend `getServerUrl()`.
 * - Legacy absolute `http(s)://<old-host>/uploads/(avatars|covers|banners|images)/...` URLs are also
 *   remapped onto the active server so switching server URLs never breaks previously uploaded files.
 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/')) return `${activeServerUrl}${url}`;
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (/^\/uploads\/(?:avatars|covers|banners|images)\/[\w.-]+$/i.test(parsed.pathname)) {
        return `${activeServerUrl}${parsed.pathname}`;
      }
    } catch {
      /* return raw */
    }
  }
  return url;
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

/** Video storage status: stored locally on the server under `uploads/videos/`. */
export const videoStorageStatus = () =>
  request<{ configured: boolean; storage?: string; maxBytes: number; types: string[] }>('/admin/uploads/video/status');

/**
 * Two real stages, each with its own percentage:
 *  - 'sending': the video leaving this browser for the server (XHR upload progress).
 *  - 'storing': the server moving/saving the file into `uploads/videos/`.
 */
export type VideoUploadProgress = { stage: 'sending' | 'storing'; percent: number };

/**
 * Uploads one lesson video to the server (`POST /api/admin/uploads/video`), which saves it in
 * `uploads/videos/courses/...` and resolves with the relative key the lesson stores.
 */
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
          } else if (entry.stage === 'done') {
            onProgress({ stage: 'storing', percent: 100 });
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
 * Multipart image upload (cover art, banners, etc.).
 * Goes straight to the server's `/api/uploads` (stored in `uploads/`), returning a relative `/uploads/...` URL.
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
  /** Settings plus the built-in content defaults, for the Content page. */
  getSettingsWithDefaults: () =>
    request<{ settings: AppSettings; contentDefaults?: ContentDefaults }>('/admin/settings'),
  updateSettings: (data: Partial<AppSettings>) =>
    request<{ settings: AppSettings }>('/admin/settings', { method: 'PUT', body: data }).then((r) => r.settings),
  /** Changes the admin's login (username = email) and/or password. The current password is always required. */
  updateAccount: (data: { email?: string; currentPassword: string; newPassword?: string }) =>
    request<{ user: { email: string } }>('/admin/account', { method: 'PATCH', body: data }),
};
