// Sign-in SMS: what goes out to each provider, how answers are read, and what reaches the log.
// Run with `npm test` (node:test, no network — fetch is replaced).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  OTP_VALID_MINUTES,
  buildSmsRequest,
  createSmsSender,
  providerAccepted,
  smsConfigFrom,
  smsStatusFrom,
} from '../src/services/sms.js';

const PHONE = '9876543210';
const CODE = '482913';

function recordingLog() {
  const lines = [];
  const push = (...args) => lines.push(args.map(String).join(' '));
  return { lines, log: push, warn: push, error: push };
}

function fakeFetch(status, body, calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    return { status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
  };
}

describe('configuration', () => {
  it('is off without SMS_PROVIDER and lists what a chosen provider still needs', () => {
    assert.deepEqual(smsStatusFrom(smsConfigFrom({})), { provider: null, label: null, configured: false, missing: [] });
    assert.deepEqual(smsConfigFrom({ SMS_PROVIDER: 'msg91' }).missing, ['MSG91_AUTH_KEY', 'MSG91_TEMPLATE_ID']);
    assert.deepEqual(smsConfigFrom({ SMS_PROVIDER: '2factor' }).missing, ['TWOFACTOR_API_KEY']);
    assert.equal(smsConfigFrom({ SMS_PROVIDER: 'fast2sms', FAST2SMS_API_KEY: 'k' }).configured, false);
    assert.equal(smsConfigFrom({ SMS_PROVIDER: 'fast2sms', FAST2SMS_API_KEY: 'k', FAST2SMS_OTP_ID: 'o' }).configured, true);
    assert.equal(
      smsConfigFrom({ SMS_PROVIDER: 'fast2sms', FAST2SMS_API_KEY: 'k', FAST2SMS_SENDER_ID: 'YDUACD', FAST2SMS_MESSAGE_ID: '1' }).configured,
      true
    );
    assert.match(smsConfigFrom({ SMS_PROVIDER: 'twilio' }).missing[0], /not msg91, 2factor or fast2sms/);
  });

  it('accepts spelling variants and stray spaces', () => {
    const config = smsConfigFrom({ SMS_PROVIDER: ' TwoFactor ', TWOFACTOR_API_KEY: ' key ' });
    assert.equal(config.provider, '2factor');
    assert.equal(config.twoFactor.apiKey, 'key');
    assert.equal(smsStatusFrom(config).label, '2Factor');
  });
});

describe('requests', () => {
  it('MSG91: OTP API with our own code, 91-prefixed number and the authkey header', () => {
    const config = smsConfigFrom({ SMS_PROVIDER: 'msg91', MSG91_AUTH_KEY: 'AUTH', MSG91_TEMPLATE_ID: 'TPL' });
    const { url, init } = buildSmsRequest(config, PHONE, CODE);
    const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, 'https://control.msg91.com/api/v5/otp');
    assert.equal(parsed.searchParams.get('template_id'), 'TPL');
    assert.equal(parsed.searchParams.get('mobile'), `91${PHONE}`);
    assert.equal(parsed.searchParams.get('otp'), CODE);
    assert.equal(parsed.searchParams.get('otp_length'), '6');
    assert.equal(parsed.searchParams.get('otp_expiry'), String(OTP_VALID_MINUTES));
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.authkey, 'AUTH');
    assert.equal(init.headers['Content-Type'], 'application/json');
  });

  it('2Factor: key, number and code in the path, template only when named', () => {
    const plain = buildSmsRequest(smsConfigFrom({ SMS_PROVIDER: '2factor', TWOFACTOR_API_KEY: 'K-1' }), PHONE, CODE);
    assert.equal(plain.url, `https://2factor.in/API/V1/K-1/SMS/${PHONE}/${CODE}`);
    assert.equal(plain.init.method, 'POST');
    const named = buildSmsRequest(
      smsConfigFrom({ SMS_PROVIDER: '2factor', TWOFACTOR_API_KEY: 'K-1', TWOFACTOR_TEMPLATE: 'YDU Login' }),
      PHONE,
      CODE
    );
    assert.equal(named.url, `https://2factor.in/API/V1/K-1/SMS/${PHONE}/${CODE}/YDU%20Login`);
  });

  it('Fast2SMS OTP API: 10-digit mobile, otp_id and our code', () => {
    const config = smsConfigFrom({ SMS_PROVIDER: 'fast2sms', FAST2SMS_API_KEY: 'KEY', FAST2SMS_OTP_ID: 'OTPID' });
    const { url, init } = buildSmsRequest(config, PHONE, CODE);
    assert.equal(url, 'https://www.fast2sms.com/dev/otp/send');
    assert.equal(init.headers.authorization, 'KEY');
    assert.deepEqual(JSON.parse(init.body), {
      mobile: PHONE,
      otp_id: 'OTPID',
      otp: CODE,
      otp_length: 6,
      otp_expiry: OTP_VALID_MINUTES,
    });
  });

  it('Fast2SMS DLT route: sender, numeric Message ID and filled variables', () => {
    const config = smsConfigFrom({
      SMS_PROVIDER: 'fast2sms',
      FAST2SMS_API_KEY: 'KEY',
      FAST2SMS_SENDER_ID: 'YDUACD',
      FAST2SMS_MESSAGE_ID: '170512',
      FAST2SMS_VARIABLES: '{otp}|{minutes}',
    });
    const { url, init } = buildSmsRequest(config, PHONE, CODE);
    assert.equal(url, 'https://www.fast2sms.com/dev/bulkV2');
    assert.deepEqual(JSON.parse(init.body), {
      route: 'dlt',
      sender_id: 'YDUACD',
      message: 170512,
      variables_values: `${CODE}|${OTP_VALID_MINUTES}`,
      numbers: PHONE,
    });
    const defaults = smsConfigFrom({ SMS_PROVIDER: 'fast2sms', FAST2SMS_API_KEY: 'K', FAST2SMS_SENDER_ID: 'S', FAST2SMS_MESSAGE_ID: '1' });
    assert.equal(JSON.parse(buildSmsRequest(defaults, PHONE, CODE).init.body).variables_values, CODE);
  });
});

describe('provider answers', () => {
  it('counts only a real success as delivered', () => {
    assert.equal(providerAccepted('msg91', 200, { type: 'success', request_id: 'x' }), true);
    assert.equal(providerAccepted('msg91', 200, { type: 'error', message: 'Invalid template' }), false);
    assert.equal(providerAccepted('2factor', 200, { Status: 'Success', Details: 'session' }), true);
    assert.equal(providerAccepted('2factor', 200, { Status: 'Error', Details: 'Invalid API Key' }), false);
    assert.equal(providerAccepted('fast2sms', 200, { return: true, request_id: 'x' }), true);
    assert.equal(providerAccepted('fast2sms', 200, { return: false, message: 'Invalid OTP ID' }), false);
    assert.equal(providerAccepted('fast2sms', 500, { return: true }), false);
    assert.equal(providerAccepted('msg91', 200, null), false);
  });
});

describe('sending', () => {
  const msg91 = smsConfigFrom({ SMS_PROVIDER: 'msg91', MSG91_AUTH_KEY: 'SECRETKEY', MSG91_TEMPLATE_ID: 'TPL' });

  it('resolves when the provider takes the message', async () => {
    const calls = [];
    const { lines, ...log } = recordingLog();
    const send = createSmsSender({ config: msg91, fetchImpl: fakeFetch(200, { type: 'success' }, calls), log, production: true });
    assert.deepEqual(await send(PHONE, CODE), { sent: true, provider: 'msg91' });
    assert.equal(calls.length, 1);
    assert.ok(calls[0].init.signal, 'every request has a timeout');
    assert.equal(lines.length, 0);
  });

  it('a refusal is a 502, and the log carries the reason but never the code, number or key', async () => {
    const { lines, ...log } = recordingLog();
    const body = { type: 'error', message: `Mobile 91${PHONE} rejected, otp ${CODE}` };
    const send = createSmsSender({ config: msg91, fetchImpl: fakeFetch(200, body), log, production: true });
    await assert.rejects(send(PHONE, CODE), (error) => error.status === 502);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /MSG91 refused/);
    for (const secret of [CODE, PHONE, 'SECRETKEY']) assert.ok(!lines[0].includes(secret), `log must not contain ${secret}`);
  });

  it('an unreachable or silent provider is a 502 too', async () => {
    const { lines, ...log } = recordingLog();
    const offline = async () => {
      throw Object.assign(new Error('getaddrinfo ENOTFOUND control.msg91.com'), { name: 'TypeError' });
    };
    await assert.rejects(createSmsSender({ config: msg91, fetchImpl: offline, log, production: true })(PHONE, CODE), { status: 502 });
    const slow = async () => {
      throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    };
    await assert.rejects(createSmsSender({ config: msg91, fetchImpl: slow, log, production: true })(PHONE, CODE), { status: 502 });
    assert.match(lines[1], /no answer in 10 s/);
    const garbage = createSmsSender({ config: msg91, fetchImpl: fakeFetch(502, '<html>Bad gateway</html>'), log, production: true });
    await assert.rejects(garbage(PHONE, CODE), { status: 502 });
  });

  it('without a provider: 503 in production, the code on the console in development', async () => {
    const off = smsConfigFrom({});
    const fetchImpl = async () => assert.fail('nothing may be sent');
    await assert.rejects(createSmsSender({ config: off, fetchImpl, log: recordingLog(), production: true })(PHONE, CODE), { status: 503 });
    const { lines, ...log } = recordingLog();
    assert.deepEqual(await createSmsSender({ config: off, fetchImpl, log, production: false })(PHONE, CODE), { sent: false });
    assert.match(lines[0], new RegExp(CODE));
  });

  it('a half-configured provider never sends, and says what is missing', async () => {
    const half = smsConfigFrom({ SMS_PROVIDER: 'msg91', MSG91_AUTH_KEY: 'k' });
    const fetchImpl = async () => assert.fail('nothing may be sent');
    await assert.rejects(createSmsSender({ config: half, fetchImpl, log: recordingLog(), production: true })(PHONE, CODE), { status: 503 });
    const { lines, ...log } = recordingLog();
    await createSmsSender({ config: half, fetchImpl, log, production: false })(PHONE, CODE);
    assert.match(lines[0], /missing MSG91_TEMPLATE_ID/);
  });
});
