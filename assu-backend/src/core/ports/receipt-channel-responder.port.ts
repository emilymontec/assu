export const RECEIPT_CHANNEL_RESPONDER_PORT = Symbol('RECEIPT_CHANNEL_RESPONDER_PORT');

/**
 * Envía la respuesta final al remitente (cliente) en el canal por el
 * que llegó el comprobante. Un fallo aquí NUNCA debe revertir ni
 * bloquear el resultado de la verificación ya persistido — es
 * notificación best-effort, igual que AuditService/EventPublisher.
 */
export interface ReceiptChannelResponderPort {
  respond(recipientIdentifier: string, message: string): Promise<void>;
}
