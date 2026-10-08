import { ReceiptTextParser } from './receipt-text-parser';
import { OcrConfidence } from '../../core/domain/payment-verification/ocr-confidence.enum';

describe('ReceiptTextParser', () => {
  let parser: ReceiptTextParser;

  beforeEach(() => {
    parser = new ReceiptTextParser();
  });

  it('extrae monto, referencia y fecha de un comprobante típico de Nequi (alta confianza)', () => {
    const text = `
      Nequi
      Comprobante de pago
      Valor: $ 50.000
      Fecha: 04/09/2026
      Hora: 3:45 p.m.
      Referencia: M123456789
      Para: Assu Store
    `;

    const { data, confidence } = parser.parse(text);

    expect(data.amount).toBe(50000);
    expect(data.reference).toBe('M123456789');
    expect(data.bankName).toBe('nequi');
    expect(data.occurredAt?.getFullYear()).toBe(2026);
    expect(data.occurredAt?.getMonth()).toBe(8); // septiembre (0-indexed)
    expect(data.occurredAt?.getDate()).toBe(4);
    expect(data.occurredAt?.getHours()).toBe(15);
    expect(confidence).toBe(OcrConfidence.HIGH);
  });

  it('parsea montos con separador de miles y decimales colombianos ($1.234.567,89)', () => {
    const { data } = parser.parse('Valor: $1.234.567,89');
    expect(data.amount).toBeCloseTo(1234567.89);
  });

  it('parsea montos sin decimales ($1.234.567 -> 1234567, no 1.234567)', () => {
    const { data } = parser.parse('Total: $1.234.567');
    expect(data.amount).toBe(1234567);
  });

  it('soporta fecha en formato ISO y en español', () => {
    expect(parser.parse('Fecha: 2026-09-04').data.occurredAt?.getMonth()).toBe(8);
    expect(parser.parse('4 de septiembre de 2026').data.occurredAt?.getMonth()).toBe(8);
  });

  it('reconoce el nombre del banco por variantes de mayúsculas', () => {
    expect(parser.parse('BANCOLOMBIA - Comprobante').data.bankName).toBe('bancolombia');
    expect(parser.parse('Davivienda te informa').data.bankName).toBe('davivienda');
    expect(parser.parse('Comprobante Daviplata').data.bankName).toBe('daviplata');
  });

  it('devuelve LOW confidence y campos undefined cuando el texto no trae nada reconocible', () => {
    const { data, confidence } = parser.parse('imagen borrosa, texto ilegible ###');
    expect(data.amount).toBeUndefined();
    expect(data.reference).toBeUndefined();
    expect(confidence).toBe(OcrConfidence.LOW);
  });

  it('devuelve MEDIUM confidence cuando solo se encuentra un campo', () => {
    const { confidence } = parser.parse('Aquí solo dice: Valor: $10.000, nada más se entiende');
    expect(confidence).toBe(OcrConfidence.MEDIUM);
  });

  it('nunca lanza con texto vacío', () => {
    expect(() => parser.parse('')).not.toThrow();
    expect(parser.parse('').confidence).toBe(OcrConfidence.LOW);
  });
});
