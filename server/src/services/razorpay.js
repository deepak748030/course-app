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
