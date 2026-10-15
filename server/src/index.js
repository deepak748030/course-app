import http from 'node:http';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { connectDb } from './config/db.js';
import { env, isProd, reviewLoginEnabled } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initializeRealtime } from './realtime/socket.js';
import routes from './routes/index.js';
import { requestCounter } from './services/analytics.js';
import { razorpayWebhook } from './controllers/payments.controller.js';
import { uploadDir } from './services/uploads.js';
import { checkRazorpayKeys } from './services/razorpay.js';
import { logSmsStatus } from './services/sms.js';

const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
app.set('trust proxy', 1);

// CORS: '*' in dev, explicit origins in production.
const origins = env.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: origins.includes('*') ? true : origins,
    credentials: false,
  })
);

// gzip every JSON payload: catalog responses shrink ~70%, which the app feels
// directly on slow mobile connections.
app.use(compression());

// Razorpay webhooks are signed over the exact raw bytes, so this route must see the body
// before express.json() parses it.
app.post('/api/payments/razorpay/webhook', express.raw({ type: '*/*', limit: '1mb' }), razorpayWebhook);

app.use(express.json({ limit: '1mb' }));
if (!isProd) app.use(morgan('dev'));

// Count every /api hit for the daily request stats (in-memory, flushed to Mongo).
app.use('/api', requestCounter);

// Local fallback storage for image uploads (Cloudinary is used when configured).
app.use('/uploads', express.static(uploadDir, { maxAge: '7d', immutable: true }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

// Realtime: socket.io shares the same HTTP server and CORS policy.
initializeRealtime(server);

// Start HTTP immediately; connect to MongoDB in the background with retries.
server.listen(env.port, () => {
  console.log(`[api] YDU Academy server listening on http://0.0.0.0:${env.port}`);
  console.log(`[api] Health: http://localhost:${env.port}/api/health`);
  console.log(`[api] Realtime: socket.io on the same port (/socket.io)`);
  void checkRazorpayKeys();
  logSmsStatus();
  logReviewLogin();
});

connectDb();

process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled rejection:', reason);
});

/** Says at boot whether Google's reviewers can sign in, so a typo in the variables is caught early. */
function logReviewLogin() {
  if (reviewLoginEnabled) {
    console.log(`[auth] Play review sign-in is on for +91 XXXXXX${env.reviewPhone.slice(-4)} (fixed code, no SMS)`);
  } else if (process.env.PLAY_REVIEW_PHONE || process.env.PLAY_REVIEW_OTP) {
    console.warn('[auth] PLAY_REVIEW_PHONE / PLAY_REVIEW_OTP are set but not valid (a 10-digit mobile starting 6-9 and a 6-digit code) — the review sign-in is off.');
  }
}
