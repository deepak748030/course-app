/**
 * The server the app talks to.
 *
 * Priority order:
 *  1. Built-in default: EXPO_PUBLIC_API_URL (set at build time).
 *  2. Admin-pushed URL: `settings.apiBaseUrl` fetched from `/api/settings` (unless the user has
 *     explicitly set a manual device override via `setManualServerUrl`).
 *  3. Manual device override: set from Settings → Server connection or the offline gate.
 *
 * Cost: after startup, reading the URL is a plain variable read (`apiUrl()`). Startup requests
 * await `serverUrlReady` once so nothing fires against the wrong host.
 */
import { storage } from '@/lib/storage';

const STORAGE_KEY = 'ydu.serverUrl';
const MANUAL_KEY = 'ydu.serverUrl.manual';

export const BUILT_IN_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://course-app-na94.onrender.com')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

let active = BUILT_IN_API_URL;
let manualOverride = false;
let loaded = false;
const listeners = new Set<() => void>();

/** Returns the cleaned URL (stripping trailing slashes and `/api`), or null when empty or invalid. */
export function normalizeServerUrl(value: string | null | undefined): string | null {
  const cleaned = (value ?? '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');
  if (!cleaned) return null;
  return /^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(cleaned) ? cleaned : null;
}

/** The base URL for the next request. Synchronous. */
export function apiUrl(): string {
  return active;
}

/** True when the user saved a manual server override on this device. */
export function isManualServerUrl(): boolean {
  return manualOverride;
}

export function isServerUrlLoaded(): boolean {
  return loaded;
}

/** Resolves once the saved URL and override flag are loaded. Never rejects. */
export const serverUrlReady: Promise<void> = Promise.all([storage.get(STORAGE_KEY), storage.get(MANUAL_KEY)])
  .then(([saved, manual]) => {
    const url = normalizeServerUrl(saved);
    if (url) {
      active = url;
      manualOverride = manual === '1';
    }
  })
  .catch(() => {})
  .then(() => {
    loaded = true;
  });

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * Applies the URL reported by the server's `/api/settings` (`apiBaseUrl`).
 * If the user is on a manual device override and the server reports empty `apiBaseUrl`, the
 * manual override stays active instead of snapping back to `BUILT_IN_API_URL`.
 */
export function applyServerUrl(value: string | null | undefined): void {
  const normalized = normalizeServerUrl(value);
  if (!normalized && manualOverride) return;
  const next = normalized ?? BUILT_IN_API_URL;
  if (next === active) return;
  active = next;
  manualOverride = false;
  void storage.remove(MANUAL_KEY);
  if (next === BUILT_IN_API_URL) void storage.remove(STORAGE_KEY);
  else void storage.set(STORAGE_KEY, next);
  notifyListeners();
}

/**
 * Switches the app's server URL immediately from Settings or the offline recovery screen.
 * Passing an empty string or null clears the manual override and restores `BUILT_IN_API_URL`.
 */
export function setManualServerUrl(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    manualOverride = false;
    void storage.remove(MANUAL_KEY);
    void storage.remove(STORAGE_KEY);
    if (active !== BUILT_IN_API_URL) {
      active = BUILT_IN_API_URL;
      notifyListeners();
    }
    return active;
  }
  const next = normalizeServerUrl(trimmed);
  if (!next) {
    throw new Error('Enter a valid URL starting with http:// or https://');
  }
  manualOverride = true;
  void storage.set(MANUAL_KEY, '1');
  void storage.set(STORAGE_KEY, next);
  if (next !== active) {
    active = next;
    notifyListeners();
  }
  return active;
}

export interface ConnectionTestResult {
  ok: boolean;
  url: string;
  db?: string;
  latencyMs?: number;
  error?: string;
}

/** Tests `/api/health` on a candidate URL before saving it on the device. */
export async function testServerConnection(raw: string): Promise<ConnectionTestResult> {
  const normalized = normalizeServerUrl(raw);
  if (!normalized) {
    return { ok: false, url: raw.trim(), error: 'Enter a valid URL starting with http:// or https://' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  const started = Date.now();
  try {
    const res = await fetch(`${normalized}/api/health`, { signal: controller.signal });
    const latencyMs = Date.now() - started;
    let body: { ok?: boolean; db?: string } = {};
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
        error: body.db && body.db !== 'connected' ? `Database is ${body.db}` : `Server returned ${res.status}`,
      };
    }
    return { ok: true, url: normalized, db: body.db ?? 'connected', latencyMs };
  } catch (err) {
    return {
      ok: false,
      url: normalized,
      error: err instanceof Error && err.name === 'AbortError' ? 'Connection timed out' : 'Could not reach this server',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Fires after the URL changes, so open connections (realtime, catalog) switch to the new server. */
export function onServerUrlChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
