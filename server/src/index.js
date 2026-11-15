import './config/runtime.js';
import http from 'node:http';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import {
  getInFlightRequests,
  initClusterWorker,
  runClusterPrimary,
  shouldRunClusterPrimary,
  trackInFlightRequests,
} from './cluster.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env, isProd } from './config/env.js';
import { razorpayWebhook } from './controllers/payments.controller.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { closeRealtime, getLiveSocketCount, initializeRealtime } from './realtime/socket.js';
import routes from './routes/index.js';
import legalRoutes from './routes/legal.routes.js';
import { flushAnalytics, requestCounter } from './services/analytics.js';
import { connectRedis, disconnectRedis } from './services/cache.js';
import { shutdownCpuPool } from './services/cpuPool.js';
import { checkRazorpayKeys } from './services/razorpay.js';
import { uploadDir } from './services/uploads.js';
import { ensureVideoDirs } from './services/videoStorage.js';

function startWorkerServer() {
  const app = express();
  const server = http.createServer(app);

  // Tune HTTP Keep-Alive so reverse proxies (Caddy/Nginx/Cloudflare) reuse sockets without races.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Track in-flight HTTP requests for elastic worker scaling and zero-drop drain.
  app.use(trackInFlightRequests);

  // Baseline HTTP security headers across all responses.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // CORS: '*' in dev, explicit origins in production.
  const origins = env.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: origins.includes('*') ? true : origins,
      credentials: false,
    })
  );

  // gzip JSON payloads >= 1 KB; skip tiny responses and leave byte-range video streaming untouched.
  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => (req.path.startsWith('/api/videos/stream') ? false : compression.filter(req, res)),
    })
  );

  // Razorpay webhooks are signed over the exact raw bytes, so this route must see the body
  // before express.json() parses it.
  app.post('/api/payments/razorpay/webhook', express.raw({ type: '*/*', limit: '1mb' }), razorpayWebhook);

  app.use(express.json({ limit: '1mb' }));
  if (!isProd) app.use(morgan('dev'));

  // Count every /api hit for the daily request stats (in-memory, flushed to Mongo).
  app.use('/api', requestCounter);

  // Local server storage for uploads: public images (/uploads/avatars, /uploads/covers, /uploads/banners).
  // Course videos (/uploads/videos) and staging temp files are never exposed directly — videos stream only
  // through signed `/api/videos/stream` links.
  app.use('/uploads/videos', (_req, res) => {
    res.status(403).json({ error: 'Direct access to course videos is not allowed' });
  });
  app.use('/uploads/.tmp', (_req, res) => {
    res.status(403).json({ error: 'Forbidden' });
  });
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(uploadDir, { maxAge: '7d', immutable: true, dotfiles: 'deny' })
  );

  // Public policy pages (privacy, terms, …): plain HTML for the Play Console, no login, no database
  // required — they fall back to the built-in copy when MongoDB is unreachable.
  app.use('/legal', legalRoutes);

  // The API's own root: browsers are sent to the public policy pages; anything else keeps the JSON 404.
  app.get('/', (req, res, next) => {
    if (req.accepts('html')) res.redirect('/legal');
    else next();
  });

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  // Realtime: socket.io shares the same HTTP server and CORS policy.
  initializeRealtime(server);

  const isScaleWorker = process.env.IS_SCALE_WORKER === '1';

  // Start HTTP immediately; connect to MongoDB in the background with retries.
  server.listen(env.port, () => {
    if (!isScaleWorker) {
      console.log(`[api] YDU Academy server listening on http://0.0.0.0:${env.port}`);
      console.log(`[api] Health: http://localhost:${env.port}/api/health`);
      console.log(`[api] Uploads dir: ${uploadDir}`);
      console.log(`[api] Realtime: socket.io on the same port (/socket.io)`);
      void ensureVideoDirs().catch((err) => console.error('[uploads] could not prepare upload directories:', err));
      void checkRazorpayKeys();
    }
  });

  connectDb();
  connectRedis();

  let draining = false;
  const gracefulShutdown = async () => {
    if (draining) return;
    draining = true;

    // Stop accepting new HTTP connections from the cluster/OS immediately.
    await new Promise((resolve) => {
      server.close(() => resolve());
      // Allow up to 12s for any in-flight HTTP requests to finish.
      const waitStart = Date.now();
      const poll = setInterval(() => {
        if (getInFlightRequests() === 0 || Date.now() - waitStart >= 12_000) {
          clearInterval(poll);
          resolve();
        }
      }, 200);
      poll.unref?.();
    });

    await Promise.allSettled([
      flushAnalytics(),
      closeRealtime(),
      shutdownCpuPool(),
      disconnectDb(),
    ]);
    disconnectRedis();
    process.exit(0);
  };

  initClusterWorker({
    onDrain: gracefulShutdown,
    getSocketCount: getLiveSocketCount,
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.once(sig, () => {
      void gracefulShutdown();
    });
  }
}

if (shouldRunClusterPrimary()) {
  runClusterPrimary();
} else {
  startWorkerServer();
}

process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled rejection:', reason);
});
