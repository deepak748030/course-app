/**
 * Realtime connection to the server (socket.io).
 *
 * The app listens on the public `app` room for:
 *   - `catalog.changed`  → the catalog context refetches (admin published/edited a course)
 *   - `settings.updated` → maintenance mode & support details refresh instantly
 * and on its private room for:
 *   - `enrollment.granted` → e.g. an admin marked an order paid elsewhere
 *
 * WebSocket-only transport: React Native ships a proper WebSocket implementation, and
 * skipping HTTP long-polling keeps the connection stack simple on mobile.
 */

import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '@/services/api';

type CatalogChangedHandler = (payload: { reason?: string; courseId?: string }) => void;
type SettingsHandler = (payload: { settings?: unknown }) => void;
type EnrollmentHandler = (payload: { courseId?: string; title?: string }) => void;

let socket: Socket | null = null;
const catalogHandlers = new Set<CatalogChangedHandler>();
const settingsHandlers = new Set<SettingsHandler>();
const enrollmentHandlers = new Set<EnrollmentHandler>();

/** Connects (once) with the learner's token when signed in; anonymous otherwise. */
export function connectRealtime(token?: string | null) {
  if (socket) {
    // A sign-in/sign-out changes who we are — reconnect with the new identity.
    if ((socket.auth as { token?: string })?.token !== (token ?? undefined)) {
      socket.disconnect();
      socket = null;
    } else {
      return socket;
    }
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 10000,
  });

  socket.on('catalog.changed', (payload: { reason?: string; courseId?: string }) => {
    catalogHandlers.forEach((handler) => handler(payload));
  });
  socket.on('settings.updated', (payload: { settings?: unknown }) => {
    settingsHandlers.forEach((handler) => handler(payload));
  });
  socket.on('enrollment.granted', (payload: { courseId?: string; title?: string }) => {
    enrollmentHandlers.forEach((handler) => handler(payload));
  });

  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

export function onCatalogChanged(handler: CatalogChangedHandler) {
  catalogHandlers.add(handler);
  return () => {
    catalogHandlers.delete(handler);
  };
}

export function onSettingsUpdated(handler: SettingsHandler) {
  settingsHandlers.add(handler);
  return () => {
    settingsHandlers.delete(handler);
  };
}

export function onEnrollmentGranted(handler: EnrollmentHandler) {
  enrollmentHandlers.add(handler);
  return () => {
    enrollmentHandlers.delete(handler);
  };
}
