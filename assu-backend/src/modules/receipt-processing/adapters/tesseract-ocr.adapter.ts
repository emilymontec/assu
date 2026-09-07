import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import { OcrPort, OcrResult } from '../../../core/ports/ocr.port';
import { ReceiptTextParser } from '../receipt-text-parser';
import { OcrProviderError } from '../receipt-processing.errors';

/**
 * Primer adapter REAL de `OcrPort` (reemplaza a `NullOcrAdapter`).
 *
 * - Imágenes (jpeg/png/webp): OCR con Tesseract.js en español.
 * - PDF: se intenta primero extraer el texto embebido con `pdf-parse`
 *   (funciona bien para comprobantes generados digitalmente, que es el
 *   caso normal de un PDF de banco — no son escaneos). Si el PDF no
 *   trae texto (por ejemplo, es una foto convertida a PDF), se devuelve
 *   confianza LOW con texto vacío en vez de fallar: renderizar páginas
 *   de PDF a imagen para correr Tesseract sobre eso requeriría `canvas`
 *   (dependencia nativa pesada, con su propio riesgo de compilación por
 *   plataforma) — se deja fuera hasta que haya evidencia real de que
 *   los clientes mandan PDFs escaneados y no digitales.
 *
 * Costo real de este adapter: la primera vez que corre, Tesseract.js
 * descarga el modelo de idioma español (`spa.traineddata`, ~15MB) desde
 * internet. En producción, considera cachear ese archivo o usar
 * `langPath` apuntando a una copia local para no depender de red en
 * cada arranque.
 */
@Injectable()
export class TesseractOcrAdapter implements OcrPort, OnModuleDestroy {
  private readonly logger = new Logger(TesseractOcrAdapter.name);
  private readonly parser = new ReceiptTextParser();
  private workerPromise: Promise<Tesseract.Worker> | null = null;

  async extract(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    try {
      const rawText =
        mimeType === 'application/pdf' ? await this.extractPdfText(fileBuffer) : await this.extractImageText(fileBuffer);

      const { data, confidence } = this.parser.parse(rawText);
      return { data, confidence, rawText };
    } catch (err) {
      // Cualquier fallo real del motor (worker que no arranca, PDF
      // corrupto que ni pdf-parse puede abrir) es un error TÉCNICO —
      // se relanza como OcrProviderError para que
      // ReceiptProcessingService/PaymentVerificationService lo lleve a
      // ERROR, nunca a un rechazo silencioso.
      throw new OcrProviderError(err instanceof Error ? err.message : String(err));
    }
  }

  private async extractImageText(fileBuffer: Buffer): Promise<string> {
    const worker = await this.getWorker();
    const {
      data: { text },
    } = await worker.recognize(fileBuffer);
    return text;
  }

  private async extractPdfText(fileBuffer: Buffer): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
    try {
      const result = await parser.getText();
      return result.text ?? '';
    } finally {
      await parser.destroy();
    }
  }

  /** Reutiliza un único worker de Tesseract entre llamadas — crearlo por request es lento (~1-2s de arranque). */
  private getWorker(): Promise<Tesseract.Worker> {
    if (!this.workerPromise) {
      this.workerPromise = Tesseract.createWorker('spa').catch((err) => {
        this.workerPromise = null; // permite reintentar en la próxima llamada si el arranque falló
        throw err;
      });
    }
    return this.workerPromise;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.workerPromise) {
      const worker = await this.workerPromise.catch(() => null);
      await worker?.terminate();
    }
  }
}
