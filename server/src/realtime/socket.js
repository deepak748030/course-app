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
    if (user) {
      socket.join(`user:${user.id}`);
      if (user.role === 'admin') socket.join('admins');
    }
    socket.emit('hello', {
      rooms: ['app', ...(user ? [`user:${user.id}`, ...(user.role === 'admin' ? ['admins'] : [])] : [])],
      serverTime: new Date().toISOString(),
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
