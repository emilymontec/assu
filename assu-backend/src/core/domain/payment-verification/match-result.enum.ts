/**
 * Resultado del motor de conciliación. Nunca se colapsa a un booleano
 * "encontrado sí/no": "no encontré movimiento" (NO_MATCH/PENDING) y
 * "encontré evidencia de que el comprobante no corresponde" (que hoy se
 * modela como REJECTED a nivel de PaymentSubmissionStatus, no aquí) son
 * cosas distintas — ver sección "regla fundamental" del roadmap.
 */
export enum MatchResult {
  EXACT_MATCH = 'EXACT_MATCH',
  PROBABLE_MATCH = 'PROBABLE_MATCH',
  AMBIGUOUS_MATCH = 'AMBIGUOUS_MATCH',
  NO_MATCH = 'NO_MATCH',
  PENDING = 'PENDING',
}
