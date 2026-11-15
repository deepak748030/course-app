import crypto from 'node:crypto';
import { env, isProd } from '../config/env.js';
import { OtpCode } from '../models/OtpCode.js';
import { User } from '../models/User.js';
import { emitToAdmins } from '../realtime/socket.js';
import { trackEvent } from '../services/analytics.js';
import { invalidateCache } from '../services/cache.js';
import { hashPassword, verifyPassword } from '../services/cpuPool.js';
import { sendOtpSms } from '../services/sms.js';
import { signToken } from '../utils/token.js';
import { HttpError, asyncHandler } from '../utils/http.js';

/** Codes live five minutes, the app may ask for a new one every 30 seconds, three wrong tries. */
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const OTP_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_PER_HOUR = 8;
/** Demo number that always fails to send, so the app's "could not reach the server" state can be tested. */
export const SIMULATED_FAILURE_PHONE = '9000000000';

/** Bounded per-phone hourly cap in memory so expired TTL docs cannot reset SMS flooding. */
const phoneWindows = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of phoneWindows) {
    if (now - entry.start > OTP_WINDOW_MS) phoneWindows.delete(key);
  }
}, 10 * 60 * 1000).unref();

const otpHash = (phone, code) =>
  crypto.createHmac('sha256', env.jwtSecret).update(`${phone}:${code}`).digest('hex');

const sameCode = (a, b) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/** Demo code is only honoured outside production, so it can never open a live account. */
const demoCodeAllowed = (code) => !isProd && sameCode(code, env.demoOtp);

/** POST /api/auth/otp/request — sends a one-time code to an Indian mobile number. */
export const requestOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (phone === SIMULATED_FAILURE_PHONE && !isProd) {
    throw new HttpError(503, 'Simulated network failure for this demo number. Try another number.');
  }

  const now = Date.now();
  const existing = await OtpCode.findOne({ phone });
  if (existing && now - existing.sentAt.getTime() < OTP_RESEND_MS) {
    throw new HttpError(429, 'A code was just sent. Wait a few seconds before asking for another.');
  }

  // Enforce per-phone hourly SMS budget across both memory and DB to protect the SMS wallet.
  let win = phoneWindows.get(phone);
  if (!win || now - win.start > OTP_WINDOW_MS) {
    if (!win && phoneWindows.size >= 20_000) {
      const oldest = phoneWindows.keys().next().value;
      if (oldest !== undefined) phoneWindows.delete(oldest);
    }
    win = { start: now, count: 0 };
    phoneWindows.set(phone, win);
  }
  const dbInWindow =
    existing?.windowStart && now - existing.windowStart.getTime() < OTP_WINDOW_MS ? existing.windowCount || 0 : 0;
  if (Math.max(win.count, dbInWindow) >= OTP_MAX_PER_HOUR) {
    throw new HttpError(429, 'Too many code requests for this mobile number. Try again in an hour.');
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = otpHash(phone, code);
  await OtpCode.findOneAndUpdate(
    { phone },
    {
      phone,
      codeHash,
      attempts: 0,
      sentAt: new Date(now),
      windowStart: new Date(win.start),
      windowCount: Math.max(win.count, dbInWindow) + 1,
      expiresAt: new Date(now + OTP_TTL_MS),
    },
    { upsert: true, new: true }
  );

  try {
    await sendOtpSms(phone, code);
  } catch (err) {
    // Roll back the unsent code so a transient SMS error does not lock the user out for 30 seconds.
    await OtpCode.deleteOne({ phone, codeHash }).catch(() => {});
    throw err;
  }
  win.count = Math.max(win.count, dbInWindow) + 1;
  res.json({ ok: true, expiresInSeconds: OTP_TTL_MS / 1000, resendInSeconds: OTP_RESEND_MS / 1000 });
});

/**
 * POST /api/auth/otp/verify — checks the code and signs the learner in.
 * A phone number that has never been seen gets a learner account on the spot.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;

  // Atomically claim one attempt so concurrent brute-force requests cannot bypass OTP_MAX_ATTEMPTS.
  const pending = await OtpCode.findOneAndUpdate(
    { phone, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (!pending) {
    await OtpCode.deleteOne({ phone });
    throw new HttpError(410, 'This code has expired. Request a new one.');
  }

  const valid = demoCodeAllowed(code) || sameCode(otpHash(phone, code), pending.codeHash);
  if (!valid) {
    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      await OtpCode.deleteOne({ _id: pending._id });
      throw new HttpError(410, 'This code has expired after three attempts. Request a new one.');
    }
    throw new HttpError(401, 'That code is not correct. Check the last message and try again.');
  }

  // Atomically consume the OTP so two concurrent requests cannot sign in with the same code.
  const consumed = await OtpCode.findOneAndDelete({ _id: pending._id, codeHash: pending.codeHash });
  if (!consumed) {
    throw new HttpError(410, 'This code has expired. Request a new one.');
  }

  let user = await User.findOne({ phone });
  let created = false;
  if (!user) {
    user = await User.create({ name: `Learner ${phone.slice(-4)}`, phone });
    created = true;
  }
  if (user.blocked) throw new HttpError(403, 'This account is blocked');

  user.lastLoginAt = new Date();
  await user.save();
  invalidateCache(`auth:user:${user._id}`);

  if (created) {
    emitToAdmins('user.registered', { name: user.name, email: user.email });
    // Server-emitted: a signup the client can never fake.
    trackEvent({ userId: user._id, event: 'signup' });
  }

  // isNewUser = this verify created the account. The app shows its one-time
  // "what do you work with" step only then; returning numbers go straight home.
  res.json({ token: signToken(user), user, isNewUser: created });
});

/** POST /api/auth/register — email + password accounts (dev/bootstrap use; disabled in production). */
export const register = asyncHandler(async (req, res) => {
  if (isProd) throw new HttpError(403, 'Email registration is disabled. Sign in with your mobile number.');
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await hashPassword(password, 10);
  const user = await User.create({ name, email, passwordHash });

  emitToAdmins('user.registered', { name: user.name, email: user.email });
  // Server-emitted: a signup the client can never fake.
  trackEvent({ userId: user._id, event: 'signup' });
  res.status(201).json({ token: signToken(user), user });
});

/** POST /api/auth/login — email + password, used by the admin dashboard. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email?.trim().toLowerCase();

  const user = cleanEmail ? await User.findOne({ email: cleanEmail }) : null;
  // Same message for unknown email, phone-only accounts and wrong password — no account probing.
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (user.blocked) throw new HttpError(403, 'This account is blocked');

  user.lastLoginAt = new Date();
  await user.save();
  invalidateCache(`auth:user:${user._id}`);

  res.json({ token: signToken(user), user });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const { tokenVersion: _tv, ...publicUser } = req.user?.toObject ? req.user.toObject() : req.user;
  res.json({ user: publicUser });
});
