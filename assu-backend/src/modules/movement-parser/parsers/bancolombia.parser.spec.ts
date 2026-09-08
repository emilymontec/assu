import { parseBancolombiaMovement } from './bancolombia.parser';
import { MovementType } from '../../../core/domain/movement/movement-type.enum';

describe('parseBancolombiaMovement', () => {
  it('parsea un monto en formato colombiano ("$10.000") a número entero', () => {
    const result = parseBancolombiaMovement({ numeroReferencia: 'ref-1', valor: '$10.000', fecha: '2026-01-15' });

    expect(result.amount).toBe(10000);
    expect(result.currency).toBe('COP');
  });

  it('conserva la referencia y recorta espacios', () => {
    const result = parseBancolombiaMovement({
      numeroReferencia: '  ref-123  ',
      valor: '5000',
      fecha: '2026-01-15',
    });

    expect(result.reference).toBe('ref-123');
  });

  it('devuelve referencia vacía (no lanza) si el campo viene ausente', () => {
    const result = parseBancolombiaMovement({ valor: '5000', fecha: '2026-01-15' });

    expect(result.reference).toBe('');
  });

  it('devuelve amount NaN si el monto no se puede interpretar, sin lanzar', () => {
    const result = parseBancolombiaMovement({ numeroReferencia: 'ref-1', valor: null, fecha: '2026-01-15' });

    expect(Number.isNaN(result.amount)).toBe(true);
  });

  it('asigna movementType UNKNOWN por defecto (pendiente de inferencia real)', () => {
    const result = parseBancolombiaMovement({ numeroReferencia: 'ref-1', valor: '1000', fecha: '2026-01-15' });

    expect(result.movementType).toBe(MovementType.UNKNOWN);
  });

  it('sender/receiver quedan null (placeholder no los expone todavía)', () => {
    const result = parseBancolombiaMovement({ numeroReferencia: 'ref-1', valor: '1000', fecha: '2026-01-15' });

    expect(result.sender).toBeNull();
    expect(result.receiver).toBeNull();
  });
});
