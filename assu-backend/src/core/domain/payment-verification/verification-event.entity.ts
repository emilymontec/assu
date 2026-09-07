import { PaymentSubmissionStatus } from './payment-submission-status.enum';

/**
 * Un renglón de auditoría por CADA cambio de estado de un
 * PaymentSubmission. Es lo que permite responder "¿por qué se verificó
 * o rechazó este pago?" sin adivinar, y lo que impide que una
 * transición como REJECTED → VERIFIED ocurra sin quedar registrada con
 * su actor y su razón.
 */
export class VerificationEvent {
  constructor(
    public readonly id: string,
    public readonly submissionId: string,
    public readonly fromStatus: PaymentSubmissionStatus | null,
    public readonly toStatus: PaymentSubmissionStatus,
    public readonly reason: string | null,
    public readonly actor: string,
    public readonly createdAt: Date,
  ) {}
}
