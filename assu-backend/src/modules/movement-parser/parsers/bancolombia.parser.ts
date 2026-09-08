import { MovementType } from '../../../core/domain/movement/movement-type.enum';
import { RawMovement } from '../../../core/domain/movement/movement.entity';
import { ParsedMovementFields } from '../movement-parser.types';

/**
 * ⚠️ Igual que `nequi.parser.ts`: el formato exacto en que Bancolombia
 * muestra fechas/montos en su Sucursal Virtual solo se confirma
 * inspeccionando el portal real (Fase 0, pendiente). Las heurísticas de
 * abajo son las mismas que para Nequi (formato colombiano típico), no
 * una garantía de que Bancolombia lo muestre igual.
 */

/** "$10.000" / "10.000" / "10000" → 10000 (pesos colombianos, sin centavos). */
function parseColombianAmount(raw: string | null): number {
  if (!raw) return NaN;
  const digitsOnly = raw.replace(/[^\d]/g, '');
  return digitsOnly ? Number(digitsOnly) : NaN;
}

/** Placeholder de parseo de fecha — reemplazar con el formato real que use el portal. */
function parseBancolombiaDate(raw: string | null): Date {
  if (!raw) return new Date(NaN);
  return new Date(raw);
}

export function parseBancolombiaMovement(raw: RawMovement): ParsedMovementFields {
  const reference = typeof raw.numeroReferencia === 'string' ? raw.numeroReferencia.trim() : '';
  const amount = parseColombianAmount(typeof raw.valor === 'string' ? raw.valor : null);
  const date = parseBancolombiaDate(typeof raw.fecha === 'string' ? raw.fecha : null);

  return {
    reference,
    amount,
    currency: 'COP',
    sender: null,
    receiver: null,
    // TODO: inferir DEPOSIT/TRANSFER/WITHDRAWAL a partir de `raw.descripcion`
    // una vez se conozcan las descripciones reales que usa Bancolombia.
    movementType: MovementType.UNKNOWN,
    date,
  };
}
