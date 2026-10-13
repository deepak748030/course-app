/**
 * Realtime channel (socket.io) for the dashboard.
 *
 * Connects with the signed-in admin's token so the server admits the socket into the
 * `admins` room, then surfaces the live activity the server pushes:
 *
 *   order.created    a learner paid (or a payment was recorded)
 *   user.registered  a new account signed up
 *   review.created   a learner posted a review
 *   catalog.changed  a course or category was created/edited/deleted
 *   settings.updated the app settings changed
 *
 * The dashboard uses this for two things: instant toasts in the layout, and automatic
 * refreshes on the page whose data just changed.
 */
import { io, type Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { getToken, SERVER_URL } from './client';

export type RealtimeEvent =
  | 'order.created'
  | 'user.registered'
  | 'review.created'
  | 'catalog.changed'
  | 'settings.updated';

type Handler = (payload: Record<string, unknown>) => void;

let socket: Socket | null = null;
let connected = false;

/** Live presence pushed by the server (online learners, admins, visitors). */
export type Presence = {
  total: number;
  signedIn: number;
  learners: number;
  admins: number;
  visitors: number;
  at?: string;
};
let presence: Presence | null = null;
const presenceListeners = new Set<(p: Presence | null) => void>();

function setPresence(next: Presence | null) {
  presence = next;
  presenceListeners.forEach((cb) => cb(next));
}

export const getPresence = () => presence;
export function onPresence(cb: (p: Presence | null) => void) {
  presenceListeners.add(cb);
  return () => {
    presenceListeners.delete(cb);
  };
}

const statusListeners = new Set<(on: boolean) => void>();
const handlers = new Map<RealtimeEvent, Set<Handler>>();

function setConnected(next: boolean) {
  if (connected !== next) {
    connected = next;
    statusListeners.forEach((cb) => cb(next));
  }
}

export const isRealtimeConnected = () => connected;
export function onRealtimeStatus(cb: (connected: boolean) => void) {
  statusListeners.add(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

export function onRealtimeEvent(event: RealtimeEvent, handler: Handler) {
  if (!handlers.has(event)) {
    handlers.set(event, new Set());
  }
  handlers.get(event)?.add(handler);
  return () => {
    handlers.get(event)?.delete(handler);
  };
}

function wire(socketInstance: Socket) {
  for (const event of handlers.keys()) {
    socketInstance.on(event, (payload: Record<string, unknown>) => {
      handlers.get(event as RealtimeEvent)?.forEach((handler) => handler(payload ?? {}));
    });
  }
}

/** Called once the admin is signed in and the dashboard talks to a real server. */
export function connectRealtime() {
  if (socket) return;
  const token = getToken();
  if (!token) return;

  // Straight to the backend server (VITE_API_URL in .env) — no proxy in between.
  socket = io(SERVER_URL, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => setConnected(true));
  socket.on('disconnect', () => {
    setConnected(false);
    setPresence(null);
  });
  socket.on('connect_error', () => {
    setConnected(false);
    setPresence(null);
  });
  socket.on('presence.updated', (p: Presence) => setPresence(p));
  wire(socket);
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
  setConnected(false);
  setPresence(null);
}

/**
 * Re-run `reload` whenever one of the given server events arrives.
 * Debounced lightly so a burst (one save can emit several events) hits the API once.
 */
export function useRealtimeRefresh(events: RealtimeEvent[], reload: () => void) {
  useEffect(() => {
    let timer: number | undefined;
    const offs = events.map((event) =>
      onRealtimeEvent(event, () => {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => reload(), 400);
      })
    );
    return () => {
      offs.forEach((off) => off());
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join(','), reload]);
}

/** Live presence for the dashboard; `null` while the socket is down. */
export function usePresence() {
  const [value, setValue] = useState<Presence | null>(getPresence());
  useEffect(() => onPresence(setValue), []);
  return value;
}
