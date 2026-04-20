/**
 * Payment service — Cashfree-shaped stub.
 *
 * `initiatePayment` is a 1-line swap to the real Cashfree SDK call once
 * the integration lands. The payload shape is final.
 */

export interface PaymentRequest {
  amount: number; // in INR (rupees)
  currency: 'INR';
  userId: string;
  salonId: string;
  serviceIds: string[];
  bookingDraft: {
    date: string; // ISO date
    time: string; // e.g. "10:30 AM"
    artistId?: string | null;
  };
  metadata: {
    source: 'customer-app';
    [key: string]: string;
  };
}

export interface PaymentResponse {
  orderId: string;
  status: 'pending' | 'success' | 'failed';
  paymentSessionId?: string;
  error?: string;
}

/**
 * Stub — returns a fake successful order after 600ms.
 * Replace body with real Cashfree create-order call when ready.
 */
export const initiatePayment = async (
  req: PaymentRequest,
): Promise<PaymentResponse> => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[payments] initiatePayment (stub)', req);
  }
  await new Promise((r) => setTimeout(r, 600));
  return {
    orderId: `mock_${Date.now()}`,
    status: 'success',
  };
};
