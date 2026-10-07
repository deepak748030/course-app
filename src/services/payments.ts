/**
 * Payment service boundary.
 *
 * No payment gateway is configured. `demoPaymentService` never contacts a network, never
 * collects card data and never reports a real settlement — the checkout screen calls it
 * "Demo" everywhere and the three scenarios below are deterministic so every state can be
 * reproduced on demand.
 *
 * To go live: implement `PaymentService` against Razorpay/Stripe/<gateway> and swap the
 * export. `checkout/[id].tsx` only depends on this interface.
 */

export type DemoScenario = 'success' | 'failure' | 'cancel';

export type PaymentResult =
  | { status: 'paid'; reference: string }
  | { status: 'failed'; reason: string }
  | { status: 'cancelled' };

export interface PaymentService {
  /** Amount is in whole rupees; the gateway call would happen here. */
  authorize(input: { courseId: string; amountInr: number; scenario: DemoScenario }): Promise<PaymentResult>;
}

export const demoScenarios: { id: DemoScenario; label: string; help: string }[] = [
  { id: 'success', label: 'Successful payment', help: 'Unlocks the course immediately' },
  { id: 'failure', label: 'Failed payment', help: 'Shows the failure and retry state' },
  { id: 'cancel', label: 'Cancelled by user', help: 'Returns to checkout with a note' },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const demoPaymentService: PaymentService = {
  async authorize({ courseId, scenario }) {
    await delay(1400);
    if (scenario === 'cancel') return { status: 'cancelled' };
    if (scenario === 'failure') {
      return { status: 'failed', reason: 'The demo gateway declined this payment. No money moved.' };
    }
    return { status: 'paid', reference: `demo_${courseId}_${Date.now().toString(36)}` };
  },
};
