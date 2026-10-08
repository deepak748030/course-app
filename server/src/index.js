import http from 'node:http';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { connectDb } from './config/db.js';
import { env, isProd } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initializeRealtime } from './realtime/socket.js';
import routes from './routes/index.js';
import { uploadDir } from './services/uploads.js';

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

app.use(express.json({ limit: '1mb' }));
if (!isProd) app.use(morgan('dev'));

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
});

connectDb();

process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled rejection:', reason);
});
