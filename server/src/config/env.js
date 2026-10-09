import 'dotenv/config';

/** Centralised environment access with safe dev defaults. */
export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  /** Fixed demo code accepted on every phone outside production (see README → Phone sign-in). */
  demoOtp: process.env.DEMO_OTP || '246810',
};

export const isProd = env.nodeEnv === 'production';

if (isProd && env.jwtSecret === 'dev-only-secret-change-me') {
  // Fail loudly rather than sign production tokens with a known secret.
  throw new Error('JWT_SECRET must be set in production. See .env.example.');
}
