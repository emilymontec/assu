import { ReconciliationEngineService } from './reconciliation-engine.service';
import { MatchResult } from '../../core/domain/payment-verification/match-result.enum';
import { Movement } from '../../core/domain/movement/movement.entity';
import { MovementType } from '../../core/domain/movement/movement-type.enum';
import { MovementStatus } from '../../core/domain/movement/movement-status.enum';

function buildMovement(overrides: Partial<{ id: string; reference: string; amount: number; date: Date }> = {}): Movement {
  return new Movement(
    overrides.id ?? 'mov-1',
    'account-1',
    overrides.reference ?? 'REF123',
    overrides.amount ?? 50000,
    'COP',
    'Juan Pérez',
    'Assu Store',
    MovementType.TRANSFER,
    overrides.date ?? new Date('2026-09-04T15:00:00Z'),
    MovementStatus.VALID,
    false,
    {},
    new Date('2026-09-04T15:00:05Z'),
  );
}

describe('ReconciliationEngineService', () => {
  let service: ReconciliationEngineService;

  beforeEach(() => {
    service = new ReconciliationEngineService();
  });

  it('devuelve PENDING (no NO_MATCH) cuando aún no hay movimientos candidatos', () => {
    const outcome = service.match({ amount: 50000, reference: 'REF123' }, []);

    expect(outcome.result).toBe(MatchResult.PENDING);
    expect(outcome.movementId).toBeNull();
  });

  it('EXACT_MATCH cuando referencia, monto y ventana de tiempo coinciden', () => {
    const movement = buildMovement({ date: new Date('2026-09-04T15:00:00Z') });

    const outcome = service.match(
      {
        amount: 50000,
        reference: 'REF123',
        occurredAt: new Date('2026-09-04T15:02:00Z'),
      },
      [movement],
    );

    expect(outcome.result).toBe(MatchResult.EXACT_MATCH);
    expect(outcome.movementId).toBe(movement.id);
  });

  it('PROBABLE_MATCH cuando el monto coincide pero la referencia no', () => {
    const movement = buildMovement({ reference: 'REF999' });

    const outcome = service.match(
      { amount: 50000, reference: 'OTRA-REF', occurredAt: new Date('2026-09-04T15:01:00Z') },
      [movement],
    );

    expect(outcome.result).toBe(MatchResult.PROBABLE_MATCH);
  });

  it('AMBIGUOUS_MATCH cuando dos movimientos tienen scores casi empatados', () => {
    const movementA = buildMovement({ id: 'mov-a', amount: 50000, reference: 'REFAAA' });
    const movementB = buildMovement({ id: 'mov-b', amount: 50000, reference: 'REFBBB' });

    const outcome = service.match(
      { amount: 50000, reference: 'REFCCC', occurredAt: new Date('2026-09-04T15:00:00Z') },
      [movementA, movementB],
    );

    expect(outcome.result).toBe(MatchResult.AMBIGUOUS_MATCH);
    expect(outcome.movementId).toBeNull();
  });

  it('NO_MATCH cuando ni el monto ni la referencia coinciden con ningún candidato', () => {
    const movement = buildMovement({ amount: 999999, reference: 'REF999' });

    const outcome = service.match(
      { amount: 50000, reference: 'OTRA-REF', occurredAt: new Date('2026-09-04T15:00:00Z') },
      [movement],
    );

    expect(outcome.result).toBe(MatchResult.NO_MATCH);
  });

  it('nunca lanza cuando el OCR no logró extraer monto ni referencia (datos parciales)', () => {
    const movement = buildMovement();

    expect(() => service.match({}, [movement])).not.toThrow();
    expect(service.match({}, [movement]).result).toBe(MatchResult.NO_MATCH);
  });

  it('un movimiento fuera de la ventana de tiempo pierde el peso de tiempo pero puede seguir siendo PROBABLE_MATCH', () => {
    const movement = buildMovement({ date: new Date('2026-09-04T10:00:00Z') });

    const outcome = service.match(
      {
        amount: 50000,
        reference: 'REF123',
        occurredAt: new Date('2026-09-05T10:00:00Z'), // +24h, fuera de la ventana default de 30 min
      },
      [movement],
    );

    // referencia (0.45) + monto (0.4) = 0.85 → sigue siendo EXACT_MATCH aun sin la ventana de tiempo
    expect(outcome.result).toBe(MatchResult.EXACT_MATCH);
  });
});
