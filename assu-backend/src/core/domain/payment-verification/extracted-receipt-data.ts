/**
 * Datos que el OCR logró extraer de un comprobante, ya normalizados
 * (monto en unidades decimales, fecha como Date, etc.). Todos los
 * campos son opcionales: un OCR real casi nunca extrae el 100% de los
 * campos con confianza, y `ReconciliationEngineService` debe poder
 * trabajar con datos parciales sin lanzar.
 */
export interface ExtractedReceiptData {
  amount?: number;
  currency?: string;
  occurredAt?: Date;
  reference?: string;
  bankName?: string;
  originAccountMasked?: string;
  destinationAccountMasked?: string;
  transactionType?: string;
}
