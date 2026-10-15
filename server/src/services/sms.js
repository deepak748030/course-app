/**
 * Delivers the one-time sign-in code by SMS — the only SMS the server sends.
 *
 * Pick a provider with SMS_PROVIDER and give it its keys (README → Phone sign-in, .env.example):
 *
 *   SMS_PROVIDER=msg91     MSG91_AUTH_KEY + MSG91_TEMPLATE_ID (an OTP template, ##OTP## is filled in)
 *   SMS_PROVIDER=2factor   TWOFACTOR_API_KEY, optional TWOFACTOR_TEMPLATE (2Factor's default otherwise)
 *   SMS_PROVIDER=fast2sms  FAST2SMS_API_KEY + FAST2SMS_OTP_ID (OTP API), or
 *                          FAST2SMS_API_KEY + FAST2SMS_SENDER_ID + FAST2SMS_MESSAGE_ID (DLT route)
 *
 * The server makes and checks the code itself (auth.controller.js); the provider only delivers it.
 * Indian SMS must match a DLT-approved template, e.g. "Your YDU Academy sign-in code is {#var#}. It is
 * valid for 5 minutes. Do not share it with anyone."
 *
 * Without a working provider:
 *  - development prints the code to the console so the flow can be exercised;
 *  - production answers 503 (a code must never reach a log), so a misconfigured deployment never
 *    pretends to have sent an SMS.
 *
 * Neither the code, the full number nor a key is ever logged: provider errors are logged with long
 * digit runs masked, and the request URL (which carries 2Factor's key) is never printed.
 */
import { isProd } from '../config/env.js';
import { HttpError } from '../utils/http.js';

/** Minutes a code stays valid — keep in step with OTP_TTL_MS in auth.controller.js. */
export const OTP_VALID_MINUTES = 5;
const TIMEOUT_MS = 10_000;
const SEND_FAILED = 'We could not send the SMS right now. Please try again in a minute.';

const LABELS = { msg91: 'MSG91', '2factor': '2Factor', fast2sms: 'Fast2SMS' };

const clean = (value) => String(value ?? '').trim();

function missingSettings(config) {
  const { provider, msg91, twoFactor, fast2sms } = config;
  if (!provider) return [];
  if (provider === 'msg91') {
    return [!msg91.authKey && 'MSG91_AUTH_KEY', !msg91.templateId && 'MSG91_TEMPLATE_ID'].filter(Boolean);
  }
  if (provider === '2factor') return twoFactor.apiKey ? [] : ['TWOFACTOR_API_KEY'];
  if (provider === 'fast2sms') {
    const missing = fast2sms.apiKey ? [] : ['FAST2SMS_API_KEY'];
    if (!fast2sms.otpId && !(fast2sms.senderId && fast2sms.messageId)) {
      missing.push('FAST2SMS_OTP_ID (or FAST2SMS_SENDER_ID + FAST2SMS_MESSAGE_ID)');
    }
    return missing;
  }
  return [`SMS_PROVIDER ("${provider}" is not msg91, 2factor or fast2sms)`];
}

/** Reads the SMS settings from environment variables. Pure, so tests can pass their own. */
export function smsConfigFrom(vars) {
  const raw = clean(vars.SMS_PROVIDER).toLowerCase();
  const provider = raw === 'twofactor' || raw === '2factor.in' ? '2factor' : raw || null;
  const config = {
    provider,
    msg91: { authKey: clean(vars.MSG91_AUTH_KEY), templateId: clean(vars.MSG91_TEMPLATE_ID) },
    twoFactor: { apiKey: clean(vars.TWOFACTOR_API_KEY), template: clean(vars.TWOFACTOR_TEMPLATE) },
    fast2sms: {
      apiKey: clean(vars.FAST2SMS_API_KEY),
      otpId: clean(vars.FAST2SMS_OTP_ID),
      senderId: clean(vars.FAST2SMS_SENDER_ID),
      messageId: clean(vars.FAST2SMS_MESSAGE_ID),
      variables: clean(vars.FAST2SMS_VARIABLES),
    },
  };
  config.missing = missingSettings(config);
  config.configured = Boolean(provider) && config.missing.length === 0;
  return config;
}

/** "{otp}|{minutes}" → "482913|5": fills the values of a template's {#var#} slots. */
const fillVariables = (pattern, code) =>
  pattern.replaceAll('{otp}', code).replaceAll('{minutes}', String(OTP_VALID_MINUTES));

/** The provider request for one code. Pure, so tests can check exactly what goes out. */
export function buildSmsRequest(config, phone, code) {
  const json = { 'Content-Type': 'application/json', Accept: 'application/json' };

  if (config.provider === 'msg91') {
    // OTP API with our own code: MSG91 fills ##OTP## in the template and only delivers it.
    const query = new URLSearchParams({
      template_id: config.msg91.templateId,
      mobile: `91${phone}`,
      otp: code,
      otp_length: String(code.length),
      otp_expiry: String(OTP_VALID_MINUTES),
    });
    return {
      url: `https://control.msg91.com/api/v5/otp?${query}`,
      init: { method: 'POST', headers: { ...json, authkey: config.msg91.authKey }, body: '{}' },
    };
  }

  if (config.provider === '2factor') {
    // /API/V1/{key}/SMS/{phone}/{otp}[/{template}] — 2Factor's default OTP template unless one is named.
    const parts = [config.twoFactor.apiKey, 'SMS', phone, code, config.twoFactor.template].filter(Boolean);
    return {
      url: `https://2factor.in/API/V1/${parts.map(encodeURIComponent).join('/')}`,
      init: { method: 'POST', headers: { Accept: 'application/json' } },
    };
  }

  if (config.provider === 'fast2sms') {
    const { apiKey, otpId, senderId, messageId, variables } = config.fast2sms;
    const headers = { ...json, authorization: apiKey };
    if (otpId) {
      // OTP API (an OTP template made in the Fast2SMS panel), with our own code.
      const body = { mobile: phone, otp_id: otpId, otp: code, otp_length: code.length, otp_expiry: OTP_VALID_MINUTES };
      if (variables) body.variables_values = fillVariables(variables, code);
      return { url: 'https://www.fast2sms.com/dev/otp/send', init: { method: 'POST', headers, body: JSON.stringify(body) } };
    }
    // DLT route: your approved sender ID and template (Message ID from DLT Manager).
    const body = {
      route: 'dlt',
      sender_id: senderId,
      message: /^\d+$/.test(messageId) ? Number(messageId) : messageId,
      variables_values: fillVariables(variables || '{otp}', code),
      numbers: phone,
    };
    return { url: 'https://www.fast2sms.com/dev/bulkV2', init: { method: 'POST', headers, body: JSON.stringify(body) } };
  }

  throw new Error(`No SMS provider "${config.provider}"`);
}

/** Whether the provider says it took the message. MSG91 answers HTTP 200 even for errors. */
export function providerAccepted(provider, status, body) {
  if (status < 200 || status >= 300 || !body || typeof body !== 'object') return false;
  if (provider === 'msg91') return body.type === 'success';
  if (provider === '2factor') return String(body.Status).toLowerCase() === 'success';
  if (provider === 'fast2sms') return body.return === true;
  return false;
}

/** The provider's own words for a refusal, with numbers (the phone, the code) masked. */
function refusalReason(body, fallback) {
  const reason = body?.message ?? body?.Details ?? body?.error ?? fallback;
  const text = Array.isArray(reason) ? reason.join(' ') : String(reason ?? '');
  return mask(text) || fallback;
}

const mask = (text) => String(text).replace(/\d{4,}/g, '####').slice(0, 200);

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** What the admin may see about the setup — never a key. */
export function smsStatusFrom(config) {
  return {
    provider: config.provider,
    label: LABELS[config.provider] ?? null,
    configured: config.configured,
    missing: config.missing,
  };
}

export function createSmsSender({ config, fetchImpl = fetch, log = console, production = isProd }) {
  return async function sendOtpSms(phone, code) {
    if (!config.configured) {
      if (production) throw new HttpError(503, 'SMS delivery is not configured on this server yet.');
      if (config.provider) {
        log.warn(`[sms] SMS_PROVIDER=${config.provider} is missing ${config.missing.join(', ')}; printing the code instead (development only).`);
      }
      log.log(`[otp] dev: code for +91 ${phone} is ${code} (no SMS provider configured)`);
      return { sent: false };
    }

    const label = LABELS[config.provider];
    const { url, init } = buildSmsRequest(config, phone, code);
    let status;
    let body;
    try {
      const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
      status = response.status;
      body = parseJson(await response.text());
    } catch (error) {
      // fetch() hides the network reason (ENOTFOUND, ECONNRESET, a TLS problem …) in `cause`.
      const cause = error?.cause?.code || error?.cause?.message;
      const why =
        error?.name === 'TimeoutError'
          ? `no answer in ${TIMEOUT_MS / 1000} s`
          : mask(`${error?.message || error}${cause ? ` (${cause})` : ''}`);
      log.error(`[sms] could not reach ${label}: ${why}`);
      throw new HttpError(502, SEND_FAILED);
    }

    if (!providerAccepted(config.provider, status, body)) {
      log.error(`[sms] ${label} refused the code for +91 XXXXXX${phone.slice(-4)} (HTTP ${status}): ${refusalReason(body, 'no reason given')}`);
      throw new HttpError(502, SEND_FAILED);
    }
    return { sent: true, provider: config.provider };
  };
}

const config = smsConfigFrom(process.env);

/** Sends `code` to +91 `phone`. Throws HttpError 503 (not set up, production) or 502 (provider failed). */
export const sendOtpSms = createSmsSender({ config });

export const smsStatus = () => smsStatusFrom(config);

/** One line at boot, so a missing key shows up in the log before the first learner tries to sign in. */
export function logSmsStatus() {
  if (config.configured) {
    console.log(`[sms] sign-in codes go out through ${LABELS[config.provider]}`);
  } else if (config.provider) {
    console.error(`[sms] SMS_PROVIDER=${config.provider} is missing ${config.missing.join(', ')} — sign-in codes cannot be sent.`);
  } else if (isProd) {
    console.warn('[sms] SMS_PROVIDER is not set — sign-in codes cannot be sent (requests answer 503). See README → Phone sign-in.');
  } else {
    console.log('[sms] no SMS provider — sign-in codes are printed here (development only)');
  }
}
