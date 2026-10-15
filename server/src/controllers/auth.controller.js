import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { env, isProd, reviewLoginEnabled } from '../config/env.js';
import { OtpCode } from '../models/OtpCode.js';
import { User } from '../models/User.js';
import { emitToAdmins } from '../realtime/socket.js';
import { trackEvent } from '../services/analytics.js';
import { sendOtpSms } from '../services/sms.js';
import { signToken } from '../utils/token.js';
import { HttpError, asyncHandler } from '../utils/http.js';

/** Codes live five minutes, the app may ask for a new one every 30 seconds, three wrong tries. */
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 3;
/** Demo number that always fails to send, so the app's "could not reach the server" state can be tested. */
export const SIMULATED_FAILURE_PHONE = '9000000000';

const otpHash = (phone, code) =>
  crypto.createHmac('sha256', env.jwtSecret).update(`${phone}:${code}`).digest('hex');

const sameCode = (a, b) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/** Demo code is only honoured outside production, so it can never open a live account. */
const demoCodeAllowed = (code) => !isProd && sameCode(code, env.demoOtp);

/**
 * The Play review number (PLAY_REVIEW_PHONE + PLAY_REVIEW_OTP): its code is the fixed one from the
 * environment and no SMS is sent, so Google's reviewers can sign in. Off unless both are set.
 */
const isReviewPhone = (phone) => reviewLoginEnabled && phone === env.reviewPhone;

/** POST /api/auth/otp/request — sends a one-time code to an Indian mobile number. */
export const requestOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (phone === SIMULATED_FAILURE_PHONE && !isProd) {
    throw new HttpError(503, 'Simulated network failure for this demo number. Try another number.');
  }

  const existing = await OtpCode.findOne({ phone });
  if (existing && Date.now() - existing.sentAt.getTime() < OTP_RESEND_MS) {
    throw new HttpError(429, 'A code was just sent. Wait a few seconds before asking for another.');
  }

  const review = isReviewPhone(phone);
  const code = review ? env.reviewOtp : String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const now = Date.now();
  await OtpCode.findOneAndUpdate(
    { phone },
    {
      phone,
      codeHash: otpHash(phone, code),
      attempts: 0,
      sentAt: new Date(now),
      expiresAt: new Date(now + OTP_TTL_MS),
    },
    { upsert: true, new: true }
  );

  if (!review) {
    try {
      await sendOtpSms(phone, code);
    } catch (error) {
      // Nothing went out, so the learner may ask again straight away instead of waiting out the
      // resend timer for a code that never arrived.
      await OtpCode.deleteOne({ phone }).catch(() => {});
      throw error;
    }
  }
  res.json({ ok: true, expiresInSeconds: OTP_TTL_MS / 1000, resendInSeconds: OTP_RESEND_MS / 1000 });
});

/**
 * POST /api/auth/otp/verify — checks the code and signs the learner in.
 * A phone number that has never been seen gets a learner account on the spot.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;

  const pending = await OtpCode.findOne({ phone });
  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    throw new HttpError(410, 'This code has expired. Request a new one.');
  }

  pending.attempts += 1;
  if (pending.attempts > OTP_MAX_ATTEMPTS) {
    await OtpCode.deleteOne({ _id: pending._id });
    throw new HttpError(410, 'This code has expired after three attempts. Request a new one.');
  }

  const valid = demoCodeAllowed(code) || sameCode(otpHash(phone, code), pending.codeHash);
  if (!valid) {
    await pending.save();
    throw new HttpError(401, 'That code is not correct. Check the last message and try again.');
  }
  await OtpCode.deleteOne({ _id: pending._id });

  let user = await User.findOne({ phone });
  let created = false;
  if (!user) {
    user = await User.create({ name: `Learner ${phone.slice(-4)}`, phone });
    created = true;
  }
  if (user.blocked) throw new HttpError(403, 'This account is blocked');

  user.lastLoginAt = new Date();
  await user.save();

  if (created) {
    emitToAdmins('user.registered', { name: user.name, email: user.email });
    // Server-emitted: a signup the client can never fake.
    trackEvent({ userId: user._id, event: 'signup' });
  }

  // isNewUser = this verify created the account. The app shows its one-time
  // "what do you work with" step only then; returning numbers go straight home.
  res.json({ token: signToken(user), user, isNewUser: created });
});

/** POST /api/auth/register — email + password accounts (admin bootstrap and API use). */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, phone: phone || '' });

  emitToAdmins('user.registered', { name: user.name, email: user.email });
  // Server-emitted: a signup the client can never fake.
  trackEvent({ userId: user._id, event: 'signup' });
  res.status(201).json({ token: signToken(user), user });
});

/** POST /api/auth/login — email + password, used by the admin dashboard. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  // Same message for unknown email, phone-only accounts and wrong password — no account probing.
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (user.blocked) throw new HttpError(403, 'This account is blocked');

  user.lastLoginAt = new Date();
  await user.save();

  res.json({ token: signToken(user), user });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
