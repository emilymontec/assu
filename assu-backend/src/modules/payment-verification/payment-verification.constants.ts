import { PaymentSubmissionStatus as S } from '../../core/domain/payment-verification/payment-submission-status.enum';

/**
 * Transiciones que el propio sistema puede aplicar automáticamente
 * durante `PaymentVerificationService.process()`. Cualquier transición
 * que NO esté aquí lanza `InvalidTransitionError` — es la garantía de
 * que, por ejemplo, un bug nunca puede mover un submission de REJECTED
 * a VERIFIED "por accidente" durante el procesamiento automático.
 */
export const SYSTEM_TRANSITIONS: Record<S, S[]> = {
  [S.RECEIVED]: [S.PROCESSING, S.ERROR],
  [S.PROCESSING]: [S.PENDING_MOVEMENT, S.MANUAL_REVIEW, S.ERROR],
  [S.PENDING_MOVEMENT]: [S.MATCHING, S.ERROR],
  [S.MATCHING]: [S.VERIFIED, S.AMBIGUOUS, S.REJECTED, S.MANUAL_REVIEW, S.PENDING_MOVEMENT, S.ERROR],
  [S.ERROR]: [], // el reintento automático lo maneja BullMQ reencolando el job, no una auto-transición
  [S.AMBIGUOUS]: [],
  [S.MANUAL_REVIEW]: [],
  [S.REJECTED]: [],
  [S.VERIFIED]: [],
};

/**
 * Transiciones que SOLO un humano identificado puede aplicar, vía
 * `PaymentVerificationService.manualReview()`. En particular, esta es
 * la ÚNICA forma en que un submission puede llegar a VERIFIED desde
 * AMBIGUOUS/MANUAL_REVIEW, y la única forma de "reabrir" un REJECTED —
 * siempre queda un VerificationEvent con el actor humano y la razón.
 */
export const MANUAL_TRANSITIONS: Record<S, S[]> = {
  [S.RECEIVED]: [],
  [S.PROCESSING]: [],
  [S.PENDING_MOVEMENT]: [S.MANUAL_REVIEW],
  [S.MATCHING]: [],
  [S.AMBIGUOUS]: [S.VERIFIED, S.REJECTED, S.MANUAL_REVIEW],
  [S.MANUAL_REVIEW]: [S.VERIFIED, S.REJECTED],
  [S.REJECTED]: [S.MANUAL_REVIEW],
  [S.ERROR]: [S.MANUAL_REVIEW, S.PROCESSING],
  [S.VERIFIED]: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: S, to: S) {
    super(`Transición no permitida: ${from} → ${to}`);
  }
}

export const INVALID_TRANSITION_MESSAGE = 'Transición no permitida';
