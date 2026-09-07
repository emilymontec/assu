import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { OCR_PORT, OcrPort, OcrResult } from '../../core/ports/ocr.port';
import {
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
} from './receipt-file.constants';
import { InvalidReceiptFileError, OcrProviderError } from './receipt-processing.errors';

/**
 * Módulo 8 (OCR y comprobante): valida el archivo recibido, calcula su
 * huella (sha256, usada tanto para deduplicación como para señales de
 * fraude por reutilización) y delega la extracción de datos al
 * `OcrPort` configurado.
 *
 * PRINCIPIO CLAVE del roadmap: el OCR nunca es una fuente infalible.
 * Este servicio jamás decide "comprobante falso" — solo produce datos +
 * un nivel de confianza; la decisión de qué hacer con baja confianza
 * (MANUAL_REVIEW, nunca "rechazado") vive en PaymentVerificationService.
 */
@Injectable()
export class ReceiptProcessingService {
  private readonly logger = new Logger(ReceiptProcessingService.name);

  constructor(@Inject(OCR_PORT) private readonly ocrPort: OcrPort) {}

  /** Cubre "validación del archivo", "tamaño", "tipo MIME" de la sección 8. */
  validateFile(fileBuffer: Buffer, mimeType: string): void {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new InvalidReceiptFileError('El archivo del comprobante está vacío.');
    }

    if (fileBuffer.length > MAX_RECEIPT_FILE_SIZE_BYTES) {
      throw new InvalidReceiptFileError(
        `El archivo excede el tamaño máximo permitido (${MAX_RECEIPT_FILE_SIZE_BYTES} bytes).`,
      );
    }

    if (!ALLOWED_RECEIPT_MIME_TYPES.includes(mimeType as (typeof ALLOWED_RECEIPT_MIME_TYPES)[number])) {
      throw new InvalidReceiptFileError(`Tipo de archivo no soportado: ${mimeType}.`);
    }
  }

  /**
   * Huella determinística del archivo. Se usa para:
   *  - Detectar el mismo comprobante enviado varias veces (sección 11).
   *  - Como parte de la clave de idempotencia junto con externalMessageId.
   * NO es un hash perceptual (no detecta recortes/edits); ver
   * FraudDetectionService para esa limitación documentada.
   */
  computeFileHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Corre el OCR. Un fallo TÉCNICO del proveedor se re-lanza como
   * `OcrProviderError` para que el llamador (PaymentVerificationService)
   * lo lleve a estado ERROR — nunca a REJECTED.
   */
  async extract(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    try {
      return await this.ocrPort.extract(fileBuffer, mimeType);
    } catch (err) {
      this.logger.error(`Fallo técnico del proveedor de OCR: ${err}`);
      throw new OcrProviderError(err instanceof Error ? err.message : String(err));
    }
  }
}
