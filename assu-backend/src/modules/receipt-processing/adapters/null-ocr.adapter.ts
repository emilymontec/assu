import { Injectable, Logger } from '@nestjs/common';
import { OcrPort, OcrResult } from '../../../core/ports/ocr.port';
import { OcrConfidence } from '../../../core/domain/payment-verification/ocr-confidence.enum';

/**
 * Implementación PLACEHOLDER de `OcrPort`, equivalente a lo que
 * `NequiAdapter` es hoy para Bank Adapter System: el contrato y el
 * flujo completo (validar archivo → hash → OCR → conciliación → estado)
 * ya están cableados y probados, pero la extracción real de texto NO
 * está implementada todavía — deliberadamente, para no fingir una
 * integración con un proveedor (Google Vision / AWS Textract /
 * Tesseract) que nadie ha evaluado ni configurado.
 *
 * Devuelve SIEMPRE `confidence: LOW` y sin campos extraídos, nunca
 * datos inventados. Con `ReceiptProcessingService` + este adapter, el
 * pipeline completo funciona de punta a punta y cualquier comprobante
 * termina correctamente en `MANUAL_REVIEW` (nunca en un VERIFIED
 * automático falso) hasta que se reemplace este adapter por uno real.
 *
 * TODO (antes de producción): reemplazar este binding en
 * `receipt-processing.module.ts` por un adapter real que implemente
 * `OcrPort`, manteniendo el mismo contrato.
 */
@Injectable()
export class NullOcrAdapter implements OcrPort {
  private readonly logger = new Logger(NullOcrAdapter.name);

  async extract(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    this.logger.warn(
      `NullOcrAdapter en uso (mime=${mimeType}, bytes=${fileBuffer.length}): no hay proveedor de OCR real ` +
        'configurado. Todo comprobante caerá en MANUAL_REVIEW por baja confianza.',
    );

    return {
      data: {},
      confidence: OcrConfidence.LOW,
      rawText: '',
    };
  }
}
