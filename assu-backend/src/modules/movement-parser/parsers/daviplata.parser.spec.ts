import { parseDaviplataMovement } from './daviplata.parser';
import { MovementType } from '../../../core/domain/movement/movement-type.enum';

describe('parseDaviplataMovement', () => {
  it('parsea un monto en formato colombiano ("$10.000") a número entero', () => {
    const result = parseDaviplataMovement({ referencia: 'ref-1', monto: '$10.000', fecha: '2026-01-15' });

    expect(result.amount).toBe(10000);
    expect(result.currency).toBe('COP');
  });

  it('conserva la referencia y recorta espacios', () => {
    const result = parseDaviplataMovement({ referencia: '  ref-123  ', monto: '5000', fecha: '2026-01-15' });

    expect(result.reference).toBe('ref-123');
  });

  it('devuelve referencia vacía (no lanza) si el campo viene ausente', () => {
    const result = parseDaviplataMovement({ monto: '5000', fecha: '2026-01-15' });

    expect(result.reference).toBe('');
  });

  it('devuelve amount NaN si el monto no se puede interpretar, sin lanzar', () => {
    const result = parseDaviplataMovement({ referencia: 'ref-1', monto: null, fecha: '2026-01-15' });

    expect(Number.isNaN(result.amount)).toBe(true);
  });

  it('asigna movementType UNKNOWN por defecto (pendiente de inferencia real)', () => {
    const result = parseDaviplataMovement({ referencia: 'ref-1', monto: '1000', fecha: '2026-01-15' });

    expect(result.movementType).toBe(MovementType.UNKNOWN);
  });

  it('sender/receiver quedan null (placeholder no los expone todavía)', () => {
    const result = parseDaviplataMovement({ referencia: 'ref-1', monto: '1000', fecha: '2026-01-15' });

    expect(result.sender).toBeNull();
    expect(result.receiver).toBeNull();
  });
});
