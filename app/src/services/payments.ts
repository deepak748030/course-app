/**
 * Payment service — Razorpay Checkout.
 *
 * Flow: the server prices the course and opens a Razorpay order, the Razorpay SDK collects the
 * payment in its own sheet, and the server verifies the signed result before the course unlocks.
 * Card, UPI and bank details are entered in Razorpay's checkout and never reach this app or the
 * academy server.
 *
 * - Web: Razorpay's `checkout.js`, which opens the same modal inside the page. No WebView.
 * - iOS / Android, mode 'web' (default): the server creates a Razorpay Payment Link and the phone
 *   opens Razorpay's hosted page in the system browser. Works in Expo Go. No WebView.
 * - iOS / Android, mode 'sdk': the native `react-native-razorpay` SDK (needs a development build).
 */


import { ApiError, api, type RazorpayOrderConfig } from '@/services/api';

export type PaymentResult =
  | { status: 'paid'; orderId: string }
  | { status: 'failed'; reason: string }
  | { status: 'cancelled' };

/** A payment page the checkout screen shows inside the app. `closed` resolves when the user closes it. */
export type PaymentPage = { closed: Promise<void>; close: () => void };

export interface PaymentService {
  /**
   * Runs the whole purchase: create the order, collect payment, verify it on the server.
   * `openPaymentPage` shows Razorpay's hosted page inside the app (WebView) when the phone has no
   * native SDK.
   */
  pay(input: {
    courseId: string;
    couponCode?: string;
    mode?: 'web' | 'sdk';
    openPaymentPage?: (url: string) => PaymentPage;
  }): Promise<PaymentResult>;
}

/** Razorpay's error code for "the user closed the sheet" (PAYMENT_CANCELLED). */
const RAZORPAY_PAYMENT_CANCELLED = 2;
const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
/** How long the app waits for the hosted payment page before asking the user to try again. */
const LINK_WAIT_MS = 5 * 60 * 1000;
const LINK_POLL_MS = 3000;

type CheckoutSuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type CheckoutError = { code?: number | string; description?: string };

type WebRazorpay = new (options: Record<string, unknown>) => {
  on(event: 'payment.failed', handler: (response: { error?: CheckoutError }) => void): void;
  open(): void;
};

function checkoutOptions(config: RazorpayOrderConfig) {
  return {
    key: config.keyId,
    amount: config.amount,
    currency: config.currency,
    name: config.name,
    description: config.description,
    order_id: config.orderId,
    prefill: config.prefill,
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Phone without the native SDK (Expo Go, or mode 'web'): shows Razorpay's hosted Payment Link inside
 * the app and waits for the server to confirm it. Closing the page without paying cancels the purchase.
 */
async function payWithPaymentLink(input: {
  courseId: string;
  couponCode?: string;
  openPaymentPage?: (url: string) => PaymentPage;
}): Promise<PaymentResult> {
  if (!input.openPaymentPage) {
    return { status: 'failed', reason: 'The payment page could not be opened. Please try again.' };
  }

  let created: Awaited<ReturnType<typeof api.createRazorpayPaymentLink>>;
  try {
    created = await api.createRazorpayPaymentLink({ courseId: input.courseId, couponCode: input.couponCode });
  } catch (err) {
    return { status: 'failed', reason: describeFailure(err) };
  }

  const page = input.openPaymentPage(created.paymentLink.url);
  let pageClosed = false;
  void page.closed.then(() => {
    pageClosed = true;
  });

  const deadline = Date.now() + LINK_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(LINK_POLL_MS);
    try {
      const res = await api.razorpayLinkStatus(created.order._id);
      if (res.status === 'paid') {
        page.close();
        return { status: 'paid', orderId: res.order._id };
      }
      if (res.status === 'cancelled') {
        page.close();
        return { status: 'cancelled' };
      }
      if (res.status === 'expired') {
        page.close();
        return { status: 'failed', reason: 'The payment link expired. Please try again.' };
      }
    } catch {
      // Briefly offline: keep waiting for the next poll.
    }
    // The user closed the page and the check above showed no payment.
    if (pageClosed) return { status: 'cancelled' };
  }
  page.close();
  return {
    status: 'failed',
    reason: 'We have not received your payment yet. If you paid, your course will unlock shortly. Otherwise try again.',
  };
}

function isCancelled(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as CheckoutError).code === RAZORPAY_PAYMENT_CANCELLED;
}

function describeFailure(err: unknown): string {
  let message = 'The payment did not go through.';
  if (err instanceof ApiError) message = err.message;
  else if (typeof err === 'object' && err !== null && 'description' in err && typeof err.description === 'string') {
    message = err.description;
  } else if (err instanceof Error) message = err.message;
  // The failure text is shown as a sentence followed by "Nothing was charged…".
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

export const razorpayPaymentService: PaymentService = {
  async pay({ courseId, couponCode, mode = 'web', openPaymentPage }) {
    // Phone without the native SDK (Expo Go, or mode 'web'): pay through the hosted Payment Link.
    const onPhone = typeof document === 'undefined';
    if (onPhone && (mode === 'web' || !nativeCheckoutAvailable())) {
      return payWithPaymentLink({ courseId, couponCode, openPaymentPage });
    }

    let created: Awaited<ReturnType<typeof api.createRazorpayOrder>>;
    try {
      created = await api.createRazorpayOrder({ courseId, couponCode });
    } catch (err) {
      return { status: 'failed', reason: describeFailure(err) };
    }

    let payment: CheckoutSuccess;
    try {
      payment =
        typeof document !== 'undefined'
          ? await openWebCheckout(created.razorpay)
          : await openNativeCheckout(created.razorpay);
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
