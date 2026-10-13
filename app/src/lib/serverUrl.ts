/**
 * The server the app talks to.
 *
 * Default: EXPO_PUBLIC_API_URL, the URL the app was built with. The admin can set another URL in
 * Settings. When the server reports one, the app switches to it and remembers it on the device.
 * An empty value in Settings means "use the built-in URL" again.
 *
 * Cost: after startup, reading the URL is a plain variable read. The saved URL is read once, in
 * parallel with the first requests. Requests wait for that read (`serverUrlReady`) so none goes
 * to the wrong server.
 */
import { storage } from '@/lib/storage';

const STORAGE_KEY = 'ydu.serverUrl';

export const BUILT_IN_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');

let active = BUILT_IN_API_URL;
let loaded = false;
const listeners = new Set<() => void>();

/** Returns the cleaned URL, or null when the value is empty or not an http(s) URL. */
export function normalizeServerUrl(value: string | null | undefined): string | null {
  const cleaned = (value ?? '').trim().replace(/\/+$/, '');
  if (!cleaned) return null;
  return /^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(cleaned) ? cleaned : null;
}

/** The base URL for the next request. Synchronous. */
export function apiUrl(): string {
  return active;
}

export function isServerUrlLoaded(): boolean {
  return loaded;
}

/** Resolves once the saved URL (if any) is loaded. Never rejects. */
export const serverUrlReady: Promise<void> = storage
  .get(STORAGE_KEY)
  .then((saved) => {
    const url = normalizeServerUrl(saved);
    if (url) active = url;
  })
  .catch(() => {})
  .then(() => {
    loaded = true;
  });

/** Switches to the server's URL. Empty or invalid means the built-in URL. Does nothing when unchanged. */
export function applyServerUrl(value: string | null | undefined): void {
  const next = normalizeServerUrl(value) ?? BUILT_IN_API_URL;
  if (next === active) return;
  active = next;
  if (next === BUILT_IN_API_URL) void storage.remove(STORAGE_KEY);
  else void storage.set(STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

/** Fires after the URL changes, so open connections (realtime) can reconnect to the new server. */
export function onServerUrlChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
