import { Injectable } from '@nestjs/common';
import { ParsedMovementFields } from '../movement-parser/movement-parser.types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/** Un día de margen hacia el futuro por husos horarios/relojes desincronizados del banco. */
const MAX_FUTURE_DATE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MovementValidatorService {
  /**
   * Valida SOLO estructura/consistencia — no consulta la base de datos
   * (eso es Movement Deduplication, módulo 10). Determina si un
   * movimiento puede intentarse guardar, no si ya existe.
   */
  validate(fields: ParsedMovementFields): ValidationResult {
    if (!Number.isFinite(fields.amount)) {
      return { valid: false, reason: 'El monto no se pudo interpretar (parser devolvió NaN)' };
    }
    if (fields.amount <= 0) {
      return { valid: false, reason: `Monto inválido: ${fields.amount}` };
    }
    if (!fields.date || Number.isNaN(fields.date.getTime())) {
      return { valid: false, reason: 'La fecha no se pudo interpretar (parser devolvió una fecha inválida)' };
    }
    if (fields.date.getTime() > Date.now() + MAX_FUTURE_DATE_MS) {
      return { valid: false, reason: 'La fecha del movimiento está en el futuro' };
    }
    if (!fields.currency) {
      return { valid: false, reason: 'Falta la moneda del movimiento' };
    }
    // Nota: `reference` vacía se PERMITE a propósito — Movement Deduplication
    // (módulo 10) usa un fallback (monto+fecha+cuenta) para ese caso, en vez
    // de descartar el movimiento aquí.
    return { valid: true };
  }
}
