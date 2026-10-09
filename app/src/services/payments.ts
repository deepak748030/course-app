/**
 * Payment service — Razorpay Checkout.
 *
 * Flow: the server prices the course and opens a Razorpay order, the Razorpay SDK collects the
 * payment in its own sheet, and the server verifies the signed result before the course unlocks.
 * Card, UPI and bank details are entered in Razorpay's checkout and never reach this app or the
 * academy server.
 *
 * - iOS / Android: the native `react-native-razorpay` SDK (needs a development build, not Expo Go).
 * - Web: Razorpay's `checkout.js`, which opens the same modal inside the page. No WebView.
 */


import { ApiError, api, type RazorpayOrderConfig } from '@/services/api';

export type PaymentResult =
  | { status: 'paid'; orderId: string }
  | { status: 'failed'; reason: string }
  | { status: 'cancelled' };

export interface PaymentService {
  /** Runs the whole purchase: create the order, collect payment, verify it on the server. */
  pay(input: { courseId: string; couponCode?: string }): Promise<PaymentResult>;
}

/** Razorpay's error code for "the user closed the sheet" (PAYMENT_CANCELLED). */
const RAZORPAY_PAYMENT_CANCELLED = 2;
const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

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

/** Native SDK: opens Razorpay's checkout sheet and resolves with the signed payment. */
async function openNativeCheckout(config: RazorpayOrderConfig): Promise<CheckoutSuccess> {
  let RazorpayCheckout: { open(options: object): Promise<CheckoutSuccess> };
  try {
    RazorpayCheckout = (require('react-native-razorpay') as { default: typeof RazorpayCheckout }).default;
  } catch {
    throw Object.assign(new Error('Payments need the app build with Razorpay. Open the development build to pay.'), {
      code: 'unavailable',
    });
  }
  return RazorpayCheckout.open(checkoutOptions(config));
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

function isCancelled(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as CheckoutError).code === RAZORPAY_PAYMENT_CANCELLED;
}

function describeFailure(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (typeof err === 'object' && err !== null && 'description' in err && typeof err.description === 'string') {
    return err.description;
  }
  if (err instanceof Error) return err.message;
  return 'The payment did not go through.';
}

export const razorpayPaymentService: PaymentService = {
  async pay({ courseId, couponCode }) {
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
