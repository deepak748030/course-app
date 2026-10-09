/**
 * Razorpay gateway boundary: the SDK client, amount helpers and signature checks.
 * Nothing else in the server talks to Razorpay directly.
 */
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

let client = null;

export const paymentsConfigured = () => Boolean(env.razorpayKeyId && env.razorpayKeySecret);

/** Public key id the app opens Checkout with. Never the secret. */
export const publicKeyId = () => env.razorpayKeyId;

export function razorpayClient() {
  if (!paymentsConfigured()) {
    throw new HttpError(503, 'Payments are not configured on this server yet.');
  }
  if (!client) client = new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
  return client;
}

/**
 * Turns a Razorpay SDK failure into a readable API error instead of a generic 500.
 * 401 means the server's key id/secret are wrong; other errors carry Razorpay's own description.
 */
export function razorpayFailure(err) {
  console.error('[payments] Razorpay request failed:', err?.statusCode, err?.error || err?.message || err);
  if (err?.statusCode === 401) {
    return new HttpError(503, 'Payments are not set up correctly on the server (Razorpay keys rejected).');
  }
  const description = err?.error?.description;
  if (description) return new HttpError(502, `Razorpay could not process this payment: ${description}`);
  return new HttpError(502, 'Razorpay is unreachable right now. Please try again in a moment.');
}

/**
 * Checks the key pair once at boot and logs the outcome, so a wrong key shows up in the
 * server log right away instead of as a 503 on the first purchase. The secret is never logged.
 */
export async function checkRazorpayKeys() {
  if (!paymentsConfigured()) {
    console.warn('[payments] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set — payments answer 503.');
    return;
  }
  try {
    await razorpayClient().orders.all({ count: 1 });
    console.log(`[payments] Razorpay keys accepted (${env.razorpayKeyId.slice(0, 12)}…)`);
  } catch (err) {
    if (err?.statusCode === 401) {
      console.error(
        '[payments] Razorpay REJECTED the keys (401 Authentication failed). Copy RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET again from the Razorpay dashboard (the secret is normally 24 characters, no spaces) and restart the server.'
      );
    } else {
      console.error('[payments] Could not reach Razorpay to check the keys:', err?.error?.description || err?.message);
    }
  }
}

/** Razorpay amounts are in paise (1 INR = 100 paise). */
export const toPaise = (amountInr) => Math.round(Number(amountInr) * 100);

const safeEqualHex = (a, b) => {
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/** Checkout success signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  if (!paymentsConfigured()) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpayWebhookSecret) return false;
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
