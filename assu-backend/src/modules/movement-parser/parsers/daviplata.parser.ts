import { MovementType } from '../../../core/domain/movement/movement-type.enum';
import { RawMovement } from '../../../core/domain/movement/movement.entity';
import { ParsedMovementFields } from '../movement-parser.types';

/**
 * ⚠️ Igual que `nequi.parser.ts`: el formato exacto en que Daviplata
 * muestra fechas/montos solo se confirma inspeccionando el portal/app
 * real (Fase 0, pendiente).
 */

/** "$10.000" / "10.000" / "10000" → 10000 (pesos colombianos, sin centavos). */
function parseColombianAmount(raw: string | null): number {
  if (!raw) return NaN;
  const digitsOnly = raw.replace(/[^\d]/g, '');
  return digitsOnly ? Number(digitsOnly) : NaN;
}

/** Placeholder de parseo de fecha — reemplazar con el formato real que use el portal/app. */
function parseDaviplataDate(raw: string | null): Date {
  if (!raw) return new Date(NaN);
  return new Date(raw);
}

export function parseDaviplataMovement(raw: RawMovement): ParsedMovementFields {
  const reference = typeof raw.referencia === 'string' ? raw.referencia.trim() : '';
  const amount = parseColombianAmount(typeof raw.monto === 'string' ? raw.monto : null);
  const date = parseDaviplataDate(typeof raw.fecha === 'string' ? raw.fecha : null);

  return {
    reference,
    amount,
    currency: 'COP',
    sender: null,
    receiver: null,
    // TODO: inferir DEPOSIT/TRANSFER/WITHDRAWAL a partir de `raw.descripcion`
    // una vez se conozcan las descripciones reales que usa Daviplata.
    movementType: MovementType.UNKNOWN,
    date,
  };
}
