/**
 * Máquina de estados de un comprobante. El orden aquí es solo
 * documentación; las transiciones VÁLIDAS están en
 * `payment-verification.constants.ts` (ALLOWED_TRANSITIONS), que es lo
 * único que `PaymentVerificationService.transition()` respeta.
 *
 *   RECEIVED
 *     ↓
 *   PROCESSING          (validando archivo + corriendo OCR)
 *     ↓
 *   PENDING_MOVEMENT    (a la espera de que Assu detecte el movimiento)
 *     ↓
 *   MATCHING            (corriendo el motor de conciliación)
 *     ├── VERIFIED        evidencia suficiente: monto+referencia+ventana de tiempo
 *     ├── AMBIGUOUS       hay candidatos pero ninguno concluyente
 *     ├── REJECTED        evidencia suficiente para descartar (no error técnico)
 *     ├── ERROR           fallo técnico (OCR, DB, timeout) — NUNCA es lo mismo que REJECTED
 *     └── MANUAL_REVIEW   requiere que un humano decida (baja confianza OCR, hash reutilizado, etc.)
 *
 * REJECTED/AMBIGUOUS/ERROR → VERIFIED solo puede ocurrir vía
 * `manualReview()`, que exige un actor humano identificado y queda
 * registrado en VerificationEvent (regla del roadmap: nunca una
 * transición silenciosa hacia VERIFIED).
 */
export enum PaymentSubmissionStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PENDING_MOVEMENT = 'PENDING_MOVEMENT',
  MATCHING = 'MATCHING',
  VERIFIED = 'VERIFIED',
  AMBIGUOUS = 'AMBIGUOUS',
  REJECTED = 'REJECTED',
  ERROR = 'ERROR',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}
