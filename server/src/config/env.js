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
  /**
   * Google Play review account (Play Console → App content → App access). One mobile number whose
   * sign-in code is fixed and never sent by SMS — works in production too. Both must be set, or
   * neither does anything. Use a number nobody owns as a real account.
   */
  reviewPhone: String(process.env.PLAY_REVIEW_PHONE || '').replace(/\D/g, '').slice(-10),
  reviewOtp: String(process.env.PLAY_REVIEW_OTP || '').trim(),
  /** Razorpay keys from the Razorpay dashboard (test keys start with rzp_test_). */
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  /** Secret set on the Razorpay dashboard webhook; signs every webhook body. */
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

export const isProd = env.nodeEnv === 'production';

/** The Play review sign-in is on only when both variables are set and well-formed. */
export const reviewLoginEnabled = /^[6-9]\d{9}$/.test(env.reviewPhone) && /^\d{6}$/.test(env.reviewOtp);

if (isProd && env.jwtSecret === 'dev-only-secret-change-me') {
  // Fail loudly rather than sign production tokens with a known secret.
  throw new Error('JWT_SECRET must be set in production. See .env.example.');
}
