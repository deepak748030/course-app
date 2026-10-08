import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { connectDb } from './config/db.js';
import { env, isProd } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

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

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

// Start HTTP immediately; connect to MongoDB in the background with retries.
app.listen(env.port, () => {
  console.log(`[api] YDU Academy server listening on http://0.0.0.0:${env.port}`);
  console.log(`[api] Health: http://localhost:${env.port}/api/health`);
});

connectDb();

process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled rejection:', reason);
});
