export interface PaymentVerificationResolvedPayload {
  submissionId: string;
  status: string; // VERIFIED | REJECTED
  movementId: string | null;
  matchResult: string | null;
  bankAccountId: string | null;
}

export const PAYMENT_VERIFICATION_RESOLVED_EVENT = 'payment.verification.resolved';
export const PAYMENT_VERIFICATION_RESOLVED_EVENT_VERSION = 'v1';
