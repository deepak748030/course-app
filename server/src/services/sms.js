/**
 * Delivers a one-time code to a phone number.
 *
 * The provider is NinzaSMS (https://ninzasms.in.net/auth/send_sms.php), configured through
 * .env — NINZA_SMS_API_KEY, NINZA_SMS_SENDER_ID and optional NINZA_SMS_ROUTE — so the same
 * code path serves development and production alike. This file is the only place the server
 * talks to NinzaSMS; the API key is used in the server-side Authorization header and never
 * reaches the app or the browser.
 *
 * Without the keys the previous behaviour stays: development prints the code to the server
 * console so the flow can be exercised, and production fails with 503 rather than pretending
 * an SMS was sent.
 */
import crypto from 'node:crypto';
import { env, isProd } from '../config/env.js';
import { HttpError } from '../utils/http.js';

const NINZA_ENDPOINT = 'https://ninzasms.in.net/auth/send_sms.php';
const REQUEST_TIMEOUT_MS = 10_000;

const ninzaConfigured = () => Boolean(env.ninzaSmsApiKey && env.ninzaSmsSenderId);

/** NinzaSMS wants a bare 10-digit national number — no +91, no leading 0. */
const ninzaNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
};

/**
 * Turns a NinzaSMS answer into a readable API error. Their documented codes: 400 malformed
 * request, 401 invalid API key, 402 insufficient balance, 403 blocked, 404 unknown sender,
 * 429 rate limited, 500/503 on their side. The 429 passes through so the app can retry after
 * a pause; everything else is a server-side problem the client cannot fix, so it becomes 502
 * with a message saying what to do.
 */
function ninzaFailure(httpStatus, msg) {
  if (httpStatus === 429) {
    return new HttpError(429, 'NinzaSMS rate limit reached. Wait a minute and try again.');
  }
  const known = {
    400: 'The SMS request was malformed. Check the server configuration.',
    401: 'The NinzaSMS API key on this server was rejected. Check NINZA_SMS_API_KEY.',
    402: 'The NinzaSMS wallet balance is too low to send this OTP. Recharge it.',
    403: 'The NinzaSMS account or this number is blocked. Contact NinzaSMS support.',
    404: 'The NinzaSMS sender id is unknown. Check NINZA_SMS_SENDER_ID.',
    500: 'NinzaSMS had an internal error. Try again shortly.',
    503: 'NinzaSMS is unavailable right now. Try again shortly.',
  };
  if (typeof httpStatus === 'number' && known[httpStatus]) {
    return new HttpError(502, known[httpStatus]);
  }
  return new HttpError(502, `NinzaSMS could not send this OTP${msg ? `: ${msg}` : '.'}`);
}

export async function sendOtpSms(phone, code) {
  if (!ninzaConfigured()) {
    if (isProd) {
      throw new HttpError(503, 'SMS delivery is not configured on this server yet.');
    }
    console.log(`[otp] dev: code for +91 ${phone} is ${code} (no SMS provider configured)`);
    return;
  }

  let response;
  try {
    response = await fetch(NINZA_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: env.ninzaSmsApiKey,
        'Content-Type': 'application/json',
        // Unique per attempt so a retried send is never delivered twice.
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        sender_id: String(env.ninzaSmsSenderId),
        numbers: ninzaNumber(phone),
        rout: env.ninzaSmsRoute,
        variables_values: String(code),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // DNS, firewall, timeout — NinzaSMS was never reached.
    console.error('[otp] NinzaSMS request failed:', err?.message || err);
    throw new HttpError(502, 'The SMS provider could not be reached. Try again shortly.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON answer (proxy error page, HTML error, …): keep the HTTP status for the log.
    console.error('[otp] NinzaSMS answered with a non-JSON body:', response.status);
    throw ninzaFailure(response.status);
  }

  // Success: { status: 1, msg, balance } — the balance is included for free, no extra API call.
  if (payload?.status === 1) return payload;

  console.error('[otp] NinzaSMS rejected the send:', { httpStatus: response.status, ...payload });
  throw ninzaFailure(response.status, payload?.msg);
}
