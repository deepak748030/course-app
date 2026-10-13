import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('bufferCommands', false); // fail fast when the DB is down, no 10s hangs
mongoose.set('strictQuery', true);

let configured = Boolean(env.mongoUri);

mongoose.connection.on('connected', () => console.log(`[db] connected to ${maskUri(env.mongoUri)}`));
mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));

function maskUri(uri) {
  return uri.replace(/\/\/([^@/]+)@/, '//***@');
}

/** true when Mongoose has a live connection. */
export const isConnected = () => mongoose.connection.readyState === 1;

/** 'not-configured' | 'connecting' | 'connected' — for /api/health. */
export function dbState() {
  if (!configured) return 'not-configured';
  return isConnected() ? 'connected' : 'connecting';
}

/**
 * Connect with retries so a temporary MongoDB outage at boot does not kill the API.
 * The HTTP server starts either way; while the DB is down, requests get a clean 503.
 */
export async function connectDb({ retries = 10, delayMs = 3000 } = {}) {
  if (!configured) {
    console.warn('[db] MONGODB_URI is not set — running without a database.');
    console.warn('[db] Copy .env.example to .env and set MONGODB_URI, then restart.');
    return false;
  }
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      const { flattenLegacySections } = await import('../models/Course.js');
      await flattenLegacySections().catch((err) => console.error('[db] section migration failed:', err.message));
      const { removeLegacyDateOfBirth } = await import('../models/User.js');
      await removeLegacyDateOfBirth().catch((err) => console.error('[db] user migration failed:', err.message));
      return true;
    } catch (err) {
      console.warn(`[db] connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error('[db] giving up — the API stays up and answers 503 until MongoDB is reachable.');
  return false;
}
