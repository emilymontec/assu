import { MovementType } from '../../../core/domain/movement/movement-type.enum';
import { RawMovement } from '../../../core/domain/movement/movement.entity';
import { ParsedMovementFields } from '../movement-parser.types';

/**
 * ⚠️ Igual que en `nequi.adapter.ts`: el FORMATO EXACTO en que Nequi
 * muestra fechas y montos en su portal es algo que solo se confirma
 * inspeccionando el sitio real (Fase 0 del roadmap, pendiente). Lo de
 * abajo son heurísticas razonables para el formato colombiano típico
 * ("$10.000", "31 dic 2025"), no una garantía de que coincidan con lo
 * que Nequi realmente muestra.
 */

/** "$10.000" / "10.000" / "10000" → 10000 (pesos colombianos, sin centavos). */
function parseColombianAmount(raw: string | null): number {
  if (!raw) return NaN;
  const digitsOnly = raw.replace(/[^\d]/g, '');
  return digitsOnly ? Number(digitsOnly) : NaN;
}

/**
 * Placeholder de parseo de fecha. Si el portal real usa un formato como
 * "31 dic 2025" habrá que reemplazar esto por un parseo explícito
 * (Date.parse no entiende abreviaturas de mes en español de forma confiable).
 */
function parseNequiDate(raw: string | null): Date {
  if (!raw) return new Date(NaN);
  const parsed = new Date(raw);
  return parsed;
}

export function parseNequiMovement(raw: RawMovement): ParsedMovementFields {
  const reference = typeof raw.referencia === 'string' ? raw.referencia.trim() : '';
  const amount = parseColombianAmount(typeof raw.monto === 'string' ? raw.monto : null);
  const date = parseNequiDate(typeof raw.fecha === 'string' ? raw.fecha : null);

  return {
    reference,
    amount,
    currency: 'COP',
    sender: null,
    receiver: null,
    // TODO: inferir DEPOSIT/TRANSFER/WITHDRAWAL a partir de `raw.descripcion`
    // una vez se conozcan las descripciones reales que usa Nequi.
    movementType: MovementType.UNKNOWN,
    date,
  };
}
