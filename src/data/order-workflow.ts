/**
 * Shared types + mock helpers for the post-order commercial workflow:
 * delivery details the customer supplies, and the quotation (transport fee +
 * payment instructions) the stock manager prepares before payment can be verified.
 *
 * This mirrors the intended real flow (order lands with stock, stock negotiates
 * delivery/payment with the customer outside the app, then formalizes it here)
 * without any backend — all state changes made through the UI are local/session-only.
 */

export type QuotationStatus =
  | "awaiting_review"
  | "quotation_sent"
  | "payment_submitted"
  | "payment_verified";

export const quotationStatusLabels: Record<QuotationStatus, string> = {
  awaiting_review: "Awaiting Review",
  quotation_sent: "Quotation Sent",
  payment_submitted: "Payment Submitted",
  payment_verified: "Payment Verified",
};

export type DeliveryDetails = {
  contactName: string;
  phone: string;
  address: string;
  city: string;
  preferredDate?: string;
  notes?: string;
};

export type OrderQuotation = {
  status: QuotationStatus;
  transportFee?: number;
  transportFeeNote?: string;
  sentAt?: string;
  paymentSubmittedAt?: string;
  verifiedAt?: string;
};

/** Company payment details shown on every quotation sent to a customer. */
export const paymentInstructions = {
  momoCode: "*182*8*1*45231#",
  momoName: "Magnificat Smart Space Ltd",
  bankName: "Bank of Kigali",
  bankAccountName: "Magnificat Smart Space Ltd",
  bankAccountNumber: "00040-11223344-55",
  bankSwift: "BKIGRWRW",
};

export const buildQuotation = (
  status: QuotationStatus,
  overrides: Partial<OrderQuotation> = {},
): OrderQuotation => ({ status, ...overrides });
