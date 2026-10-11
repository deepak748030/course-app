/**
 * Payment service — Razorpay Checkout.
 *
 * Flow: the server prices the course and opens a Razorpay order, Razorpay's checkout collects the
 * payment, and the server verifies the signed result before the course unlocks. Card, UPI and bank
 * details are entered in Razorpay's checkout and never reach this app or the academy server.
 *
 * Every checkout shows only UPI (with its QR code) and the learner's mobile number is filled in from
 * their profile, so they are not asked for it again.
 *
 * - Web: Razorpay's `checkout.js`, which opens the same modal inside the page.
 * - iOS / Android, mode 'web' (default) or no native SDK (Expo Go): the same `checkout.js` runs inside
 *   an in-app WebView, so the payment never leaves the app.
 * - iOS / Android, mode 'sdk' with the native module: the `react-native-razorpay` SDK sheet.
 */

import { ApiError, api, type RazorpayOrderConfig } from '@/services/api';

export type PaymentResult =
  | { status: 'paid'; orderId: string }
  | { status: 'failed'; reason: string }
  | { status: 'cancelled' };

/** What the in-app checkout page reports back: the signed payment, a dismissal, or a failure. */
export type CheckoutOutcome =
  | { type: 'success'; razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
  | { type: 'dismissed' }
  | { type: 'failed'; description?: string };

export interface PaymentService {
  /**
   * Runs the whole purchase: create the order, collect payment, verify it on the server.
   * `openPaymentPage` shows the checkout HTML inside the app (WebView) and resolves with the outcome.
   */
  pay(input: {
    courseId: string;
    couponCode?: string;
    mode?: 'web' | 'sdk';
    openPaymentPage?: (html: string) => Promise<CheckoutOutcome>;
  }): Promise<PaymentResult>;
}

/** Razorpay's error code for "the user closed the sheet" (PAYMENT_CANCELLED). */
const RAZORPAY_PAYMENT_CANCELLED = 2;
const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const CHECKOUT_BASE_URL = 'https://checkout.razorpay.com';

type CheckoutError = { code?: number | string; description?: string };
type CheckoutSuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };

type WebRazorpay = new (options: Record<string, unknown>) => {
  on(event: 'payment.failed', handler: (response: { error?: CheckoutError }) => void): void;
  open(): void;
};

/**
 * Razorpay options shared by every checkout surface. UPI is the only payment block (its QR code is
 * part of it), so no card, netbanking or wallet is offered. The contact field is hidden and filled
 * from the learner's profile, so the mobile number is never asked again.
 */
function checkoutOptions(config: RazorpayOrderConfig) {
  return {
    key: config.keyId,
    amount: config.amount,
    currency: config.currency,
    name: config.name,
    description: config.description,
    order_id: config.orderId,
    prefill: config.prefill,
    hidden: { contact: Boolean(config.prefill.contact), email: Boolean(config.prefill.email) },
    method: { upi: true, qr: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false },
    config: {
      display: {
        blocks: {
          upi: { name: 'Pay using UPI or QR code', instruments: [{ method: 'upi' }, { method: 'qr' }] },
        },
        sequence: ['block.upi'],
        preferences: { show_default_blocks: false },
      },
    },
    theme: { color: '#0B5C1E' },
  };
}

/**
 * True only when the native Razorpay module is compiled into this app build. In Expo Go it is not,
 * so the JS package exists but its native side is null.
 */
function nativeCheckoutAvailable(): boolean {
  try {
    const { NativeModules } = require('react-native') as typeof import('react-native');
    return Boolean((NativeModules as Record<string, unknown>).RazorpayCheckout);
  } catch {
    return false;
  }
}

/** Native SDK: opens Razorpay's checkout sheet and resolves with the signed payment. */
async function openNativeCheckout(config: RazorpayOrderConfig): Promise<CheckoutSuccess> {
  const unavailable = () =>
    Object.assign(
      new Error('Payments are not available in this app build. Install the latest development build to pay.'),
      { code: 'unavailable' },
    );
  let RazorpayCheckout: { open?: (options: object) => Promise<CheckoutSuccess> } | null | undefined;
  try {
    RazorpayCheckout = (require('react-native-razorpay') as { default: typeof RazorpayCheckout }).default;
  } catch {
    throw unavailable();
  }
  // The JS package loads even when its native half is not in this build (Expo Go, or a build made
  // before the package was installed). In that case the native module is null and there is no open().
  if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function' || !nativeCheckoutAvailable()) {
    throw unavailable();
  }
  try {
    return await RazorpayCheckout.open(checkoutOptions(config));
  } catch (err) {
    // The library reads its null native module inside open(): that is a missing build, not a payment error.
    if (err instanceof TypeError) throw unavailable();
    throw err;
  }
}

let scriptLoading: Promise<void> | null = null;

/** Web: loads Razorpay's checkout.js once. It draws the modal in this page. */
function loadWebCheckout(): Promise<WebRazorpay> {
  const scope = globalThis as unknown as { Razorpay?: WebRazorpay };
  if (scope.Razorpay) return Promise.resolve(scope.Razorpay);
  if (!scriptLoading) {
    scriptLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptLoading = null;
        reject(new Error('Razorpay Checkout could not be loaded. Check your connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptLoading.then(() => {
    if (!scope.Razorpay) throw new Error('Razorpay Checkout is not available in this browser.');
    return scope.Razorpay;
  });
}

async function openWebCheckout(config: RazorpayOrderConfig): Promise<CheckoutSuccess> {
  const Checkout = await loadWebCheckout();
  return new Promise<CheckoutSuccess>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    const checkout = new Checkout({
      ...checkoutOptions(config),
      handler: (response: CheckoutSuccess) => finish(() => resolve(response)),
      modal: {
        ondismiss: () => finish(() => reject({ code: RAZORPAY_PAYMENT_CANCELLED } satisfies CheckoutError)),
      },
    });
    checkout.on('payment.failed', (response) =>
      finish(() => reject(response.error ?? { description: 'The payment did not go through.' })),
    );
    checkout.open();
  });
}

/**
 * The page the in-app WebView loads. It runs the same Razorpay Checkout as the browser, with the same
 * options, and reports the result to the app with `ReactNativeWebView.postMessage`.
 */
export function buildCheckoutHtml(config: RazorpayOrderConfig): string {
  // `<` is escaped so no value can close the script tag early.
  const options = JSON.stringify(checkoutOptions(config)).replace(/</g, '\\u003c');
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<style>html,body{margin:0;height:100%;background:#ffffff;font-family:sans-serif}</style>
</head>
<body>
<script src="${CHECKOUT_SCRIPT_URL}"></script>
<script>
  function post(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  var options = ${options};
  options.handler = function (response) {
    post({
      type: 'success',
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature
    });
  };
  options.modal = { ondismiss: function () { post({ type: 'dismissed' }); } };
  var checkout = new Razorpay(options);
  checkout.on('payment.failed', function (response) {
    post({ type: 'failed', description: (response.error && response.error.description) || '' });
  });
  checkout.open();
</script>
</body>
</html>`;
}

/** Phone without the native SDK (Expo Go) or mode 'web': the checkout page opens inside the app. */
async function openWebViewCheckout(
  config: RazorpayOrderConfig,
  openPaymentPage: (html: string) => Promise<CheckoutOutcome>,
): Promise<CheckoutSuccess> {
  const outcome = await openPaymentPage(buildCheckoutHtml(config));
  if (outcome.type === 'success') {
    return {
      razorpay_payment_id: outcome.razorpay_payment_id,
      razorpay_order_id: outcome.razorpay_order_id,
      razorpay_signature: outcome.razorpay_signature,
    };
  }
  if (outcome.type === 'dismissed') throw { code: RAZORPAY_PAYMENT_CANCELLED } satisfies CheckoutError;
  throw { description: outcome.description || 'The payment did not go through.' } satisfies CheckoutError;
}

function isCancelled(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as CheckoutError).code === RAZORPAY_PAYMENT_CANCELLED;
}

function describeFailure(err: unknown): string {
  let message = 'The payment did not go through.';
  if (err instanceof ApiError) message = err.message;
  else if (typeof err === 'object' && err !== null && 'description' in err && typeof err.description === 'string') {
    message = err.description || message;
  } else if (err instanceof Error) message = err.message;
  // The failure text is shown as a sentence followed by "Nothing was charged…".
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

export const razorpayPaymentService: PaymentService = {
  async pay({ courseId, couponCode, mode = 'web', openPaymentPage }) {
    const onPhone = typeof document === 'undefined';
    const inAppPage = onPhone && (mode === 'web' || !nativeCheckoutAvailable());
    if (inAppPage && !openPaymentPage) {
      return { status: 'failed', reason: 'The payment page could not be opened. Please try again.' };
    }

    let created: Awaited<ReturnType<typeof api.createRazorpayOrder>>;
    try {
      created = await api.createRazorpayOrder({ courseId, couponCode });
    } catch (err) {
      return { status: 'failed', reason: describeFailure(err) };
    }

    let payment: CheckoutSuccess;
    try {
      if (inAppPage) payment = await openWebViewCheckout(created.razorpay, openPaymentPage!);
      else if (onPhone) payment = await openNativeCheckout(created.razorpay);
      else payment = await openWebCheckout(created.razorpay);
    } catch (err) {
      if (isCancelled(err)) return { status: 'cancelled' };
      return { status: 'failed', reason: describeFailure(err) };
    }

    try {
      const { order } = await api.verifyRazorpayPayment({
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      });
      return { status: 'paid', orderId: order._id };
    } catch (err) {
      return { status: 'failed', reason: describeFailure(err) };
    }
  },
};
