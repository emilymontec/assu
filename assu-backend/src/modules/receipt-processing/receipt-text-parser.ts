import { ExtractedReceiptData } from '../../core/domain/payment-verification/extracted-receipt-data';
import { OcrConfidence } from '../../core/domain/payment-verification/ocr-confidence.enum';

/**
 * Heurísticas de expresiones regulares para extraer datos de un
 * comprobante de transferencia colombiano (Nequi/Bancolombia/Davivienda)
 * a partir del texto plano que devuelve el OCR.
 *
 * IMPORTANTE — esto es un punto de partida, no una solución cerrada:
 * cada banco cambia el formato de su comprobante con el tiempo y entre
 * canales (app vs. comprobante PDF vs. captura de pantalla). Los
 * patrones de abajo cubren las variantes más comunes que se ven hoy en
 * comprobantes colombianos, pero DEBEN ajustarse con comprobantes
 * reales apenas se tengan (agregar el patrón nuevo, agregar su test, sin
 * tocar el resto del pipeline — para eso está separado de
 * `TesseractOcrAdapter`).
 *
 * Principio que se respeta aquí igual que en el resto del módulo: si no
 * se encuentra un campo, se deja `undefined` — nunca se inventa ni se
 * "adivina" un valor con baja certeza.
 */
export class ReceiptTextParser {
  parse(rawText: string): { data: ExtractedReceiptData; confidence: OcrConfidence } {
    const normalized = rawText.replace(/\r/g, '').trim();

    const amount = this.extractAmount(normalized);
    const reference = this.extractReference(normalized);
    const occurredAt = this.extractDate(normalized);
    const bankName = this.extractBankName(normalized);

    const fieldsFound = [amount, reference, occurredAt].filter((v) => v !== undefined).length;
    const confidence =
      fieldsFound >= 2 ? OcrConfidence.HIGH : fieldsFound === 1 ? OcrConfidence.MEDIUM : OcrConfidence.LOW;

    return {
      data: { amount, reference, occurredAt, bankName, currency: 'COP' },
      confidence,
    };
  }

  /**
   * Busca primero un monto etiquetado ("Valor:", "Monto:", "Total:",
   * "Importe:") y si no aparece, cae a cualquier cifra con formato de
   * pesos colombianos ($1.234.567,89 / $1.234.567 / $1234567).
   */
  private extractAmount(text: string): number | undefined {
    const labeledPattern = /(?:valor|monto|total|importe)[^\d$]{0,15}\$?\s?([\d.,]+)/i;
    const anyPattern = /\$\s?([\d.,]+)/;

    const match = labeledPattern.exec(text) ?? anyPattern.exec(text);
    if (!match) return undefined;

    return this.parseColombianNumber(match[1]);
  }

  /** "1.234.567,89" (COP: punto de miles, coma decimal) → 1234567.89 */
  private parseColombianNumber(raw: string): number | undefined {
    const cleaned = raw.trim();
    if (!cleaned) return undefined;

    const hasComma = cleaned.includes(',');
    const normalized = hasComma
      ? cleaned.replace(/\./g, '').replace(',', '.') // "1.234.567,89" -> "1234567.89"
      : cleaned.replace(/\./g, ''); // "1.234.567" -> "1234567" (punto = separador de miles, no decimal)

    const value = Number(normalized);
    return Number.isFinite(value) ? value : undefined;
  }

  private extractReference(text: string): string | undefined {
    const patterns = [
      /(?:n[uú]mero de )?referencia[:\s]+([A-Za-z0-9-]{4,})/i,
      /n[uú]m(?:ero|\.)? de (?:comprobante|aprobaci[oó]n|autorizaci[oó]n)[:\s]+([A-Za-z0-9-]{4,})/i,
      /c[oó]digo de (?:la )?transacci[oó]n[:\s]+([A-Za-z0-9-]{4,})/i,
      /comprobante n[oú°]?[.:\s]+([A-Za-z0-9-]{4,})/i,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) return match[1].trim();
    }
    return undefined;
  }

  private readonly spanishMonths: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };

  /**
   * Soporta "04/09/2026", "2026-09-04" y "4 de septiembre de 2026",
   * cada uno opcionalmente seguido de una hora ("3:45 p.m." / "15:45").
   * Cuando no hay hora, se asume medianoche — la ventana de tiempo del
   * motor de conciliación (30 min) hace que esto rara vez importe salvo
   * que el comprobante en verdad no traiga hora, en cuyo caso el campo
   * de tiempo simplemente no suma puntos en el score (ver
   * ReconciliationEngineService).
   */
  private extractDate(text: string): Date | undefined {
    let date: Date | undefined;

    const numericMatch = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text) ?? /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
    if (numericMatch) {
      const [, a, b, c] = numericMatch;
      date =
        a.length === 4
          ? new Date(Number(a), Number(b) - 1, Number(c)) // yyyy-mm-dd
          : new Date(Number(c), Number(b) - 1, Number(a)); // dd/mm/yyyy
    } else {
      const spanishMatch = /(\d{1,2}) de ([a-zA-Zé]+) de (\d{4})/i.exec(text);
      if (spanishMatch) {
        const month = this.spanishMonths[spanishMatch[2].toLowerCase()];
        if (month !== undefined) {
          date = new Date(Number(spanishMatch[3]), month, Number(spanishMatch[1]));
        }
      }
    }

    if (!date || Number.isNaN(date.getTime())) return undefined;

    const timeMatch = /(\d{1,2}):(\d{2})\s?(a\.?\s?m\.?|p\.?\s?m\.?)?/i.exec(text);
    if (timeMatch) {
      let hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      const meridiem = timeMatch[3]?.toLowerCase().replace(/[.\s]/g, '');
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      date.setHours(hours, minutes, 0, 0);
    }

    return date;
  }

  private extractBankName(text: string): string | undefined {
    const known = ['nequi', 'bancolombia', 'davivienda', 'daviplata'];
    const lower = text.toLowerCase();
    return known.find((bank) => lower.includes(bank));
  }
}
