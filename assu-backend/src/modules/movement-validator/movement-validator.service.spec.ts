import { MovementValidatorService } from './movement-validator.service';
import { MovementType } from '../../core/domain/movement/movement-type.enum';
import { ParsedMovementFields } from '../movement-parser/movement-parser.types';

function makeFields(overrides: Partial<ParsedMovementFields> = {}): ParsedMovementFields {
  return {
    reference: 'ref-1',
    amount: 10000,
    currency: 'COP',
    sender: null,
    receiver: null,
    movementType: MovementType.UNKNOWN,
    date: new Date(),
    ...overrides,
  };
}

describe('MovementValidatorService', () => {
  const validator = new MovementValidatorService();

  it('acepta un movimiento bien formado', () => {
    expect(validator.validate(makeFields())).toEqual({ valid: true });
  });

  it('rechaza monto NaN (parser no pudo interpretarlo)', () => {
    const result = validator.validate(makeFields({ amount: NaN }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/monto no se pudo interpretar/i);
  });

  it('rechaza monto cero o negativo', () => {
    expect(validator.validate(makeFields({ amount: 0 })).valid).toBe(false);
    expect(validator.validate(makeFields({ amount: -500 })).valid).toBe(false);
  });

  it('rechaza fecha inválida', () => {
    const result = validator.validate(makeFields({ date: new Date(NaN) }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/fecha no se pudo interpretar/i);
  });

  it('rechaza fechas muy en el futuro', () => {
    const farFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const result = validator.validate(makeFields({ date: farFuture }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/futuro/i);
  });

  it('rechaza moneda ausente', () => {
    const result = validator.validate(makeFields({ currency: '' }));
    expect(result.valid).toBe(false);
  });

  it('ACEPTA referencia vacía (el fallback de dedup se encarga, no el validator)', () => {
    const result = validator.validate(makeFields({ reference: '' }));
    expect(result.valid).toBe(true);
  });
});
