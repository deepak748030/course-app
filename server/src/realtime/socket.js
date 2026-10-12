/**
 * Realtime layer (socket.io).
 *
 * Rooms:
 *   - `app`        everyone connected — settings + catalog broadcasts
 *   - `admins`     connected admins — live activity feed for the dashboard
 *   - `user:<id>`  a learner's own devices — private events (e.g. enrollment granted)
 *
 * The socket handshake accepts an optional Bearer token: anonymous clients (the app
 * before sign-in, public viewers) still get the `app` broadcast room.
 */
import { Server } from 'socket.io';
import { isConnected } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { verifyToken } from '../utils/token.js';

/** @type {Server | null} */
let io = null;

/** socket id -> { userId, role } for every live connection (anonymous ones have no userId). */
const live = new Map();

/** Live presence counts. Distinct accounts, plus anonymous visitors. */
export function presenceSnapshot() {
  const signedIn = new Set();
  const learners = new Set();
  const admins = new Set();
  let visitors = 0;
  for (const c of live.values()) {
    if (!c.userId) {
      visitors += 1;
      continue;
    }
    signedIn.add(c.userId);
    if (c.role === 'admin') admins.add(c.userId);
    else learners.add(c.userId);
  }
  return {
    total: live.size,
    signedIn: signedIn.size,
    learners: learners.size,
    admins: admins.size,
    visitors,
    at: new Date().toISOString(),
  };
}

function broadcastPresence() {
  if (io) io.to('admins').emit('presence.updated', presenceSnapshot());
}

export function initializeRealtime(httpServer) {
  const origins = env.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: origins.includes('*') ? true : origins },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || '';
    if (token) {
      try {
        const payload = verifyToken(token);
        const user = isConnected() ? await User.findById(payload.sub) : null;
        if (user && !user.blocked) {
          socket.data.user = { id: String(user._id), role: user.role, name: user.name };
        }
      } catch {
        // Invalid token → connect anonymously; private rooms simply stay closed.
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.join('app');
    const user = socket.data.user;
    live.set(socket.id, { userId: user?.id ?? null, role: user?.role ?? null });
    if (user) {
      socket.join(`user:${user.id}`);
      if (user.role === 'admin') socket.join('admins');
    }
    socket.emit('hello', {
      rooms: ['app', ...(user ? [`user:${user.id}`, ...(user.role === 'admin' ? ['admins'] : [])] : [])],
      serverTime: new Date().toISOString(),
    });
    socket.emit('presence.updated', presenceSnapshot());
    broadcastPresence();

    socket.on('disconnect', () => {
      live.delete(socket.id);
      broadcastPresence();
    });
  });

  console.log('[realtime] socket.io ready');
  return io;
}

const emit = (room, event, payload) => {
  if (io) io.to(room).emit(event, { ...payload, at: new Date().toISOString() });
};

/** Live feed for the admin dashboard. */
export const emitToAdmins = (event, payload) => emit('admins', event, payload);
/** Every connected client (app + dashboard) — catalog and settings changes. */
export const emitToApp = (event, payload) => emit('app', event, payload);
/** A single learner's devices. */
export const emitToUser = (userId, event, payload) => emit(`user:${userId}`, event, payload);

/**
 * A blocked account must not keep its open app session. Tell its sockets, then drop them: the app
 * signs the learner out, and a reconnect with the same token connects anonymously (the blocked
 * check in the socket middleware). The disconnect waits a moment so the event is delivered first.
 */
export function revokeUserSockets(userId) {
  emitToUser(userId, 'account.blocked', {});
  setTimeout(() => io?.in(`user:${userId}`).disconnectSockets(true), 1500);
}
