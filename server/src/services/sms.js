/**
 * Delivers a one-time code to a phone number.
 *
 * No SMS provider is wired up yet. This is the single place to plug one in (MSG91, Twilio,
 * Gupshup, …): read the provider credentials from env here and call the provider's API.
 *
 * Until then:
 *  - development: the code is printed to the server console so the flow can be exercised;
 *  - production: nothing is logged (a code must never reach a log) and the request fails
 *    with 503, so a misconfigured deployment never pretends to have sent an SMS.
 */
import { isProd } from '../config/env.js';
import { HttpError } from '../utils/http.js';

const providerConfigured = false;

export async function sendOtpSms(phone, code) {
  if (providerConfigured) {
    // TODO: call the SMS provider here.
    return;
  }
  if (isProd) {
    throw new HttpError(503, 'SMS delivery is not configured on this server yet.');
  }
  console.log(`[otp] dev: code for +91 ${phone} is ${code} (no SMS provider configured)`);
}
