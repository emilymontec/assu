import { ExtractedReceiptData } from '../domain/payment-verification/extracted-receipt-data';
import { OcrConfidence } from '../domain/payment-verification/ocr-confidence.enum';

export const OCR_PORT = Symbol('OCR_PORT');

export interface OcrResult {
  data: ExtractedReceiptData;
  confidence: OcrConfidence;
  /** Texto crudo devuelto por el proveedor, útil para depurar extracciones fallidas. */
  rawText: string;
}

/**
 * Contrato que cualquier proveedor de OCR debe cumplir (Google Vision,
 * AWS Textract, Tesseract, etc.). El núcleo (ReceiptProcessingService,
 * ReconciliationEngineService) solo conoce esta interfaz — cambiar de
 * proveedor es cambiar el adapter registrado, nunca el core.
 *
 * IMPORTANTE: ningún adapter debe lanzar cuando el OCR simplemente no
 * logra leer la imagen con confianza; debe devolver `confidence: LOW`
 * con los campos que sí pudo extraer (aunque sea ninguno). Lanzar debe
 * reservarse para errores técnicos reales (proveedor caído, timeout,
 * archivo corrupto) — esos sí los debe manejar OcrPort.extract()
 * lanzando, para que ReceiptProcessingService los distinga de "no se
 * pudo leer con confianza" y los lleve a ERROR en vez de PENDING_REVIEW.
 */
export interface OcrPort {
  extract(fileBuffer: Buffer, mimeType: string): Promise<OcrResult>;
}
