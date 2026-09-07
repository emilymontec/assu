import { Injectable } from '@nestjs/common';
import { ExtractedReceiptData } from '../../core/domain/payment-verification/extracted-receipt-data';
import { MatchResult } from '../../core/domain/payment-verification/match-result.enum';
import { Movement } from '../../core/domain/movement/movement.entity';

export interface ReconciliationCandidateScore {
  movement: Movement;
  score: number;
  referenceMatch: boolean;
  amountMatch: boolean;
  timeWindowMatch: boolean;
}

export interface ReconciliationOutcome {
  result: MatchResult;
  score: number;
  movementId: string | null;
  candidates: ReconciliationCandidateScore[];
}

/** Ventana de tiempo por defecto para considerar "cercano" un movimiento a un comprobante. */
const DEFAULT_TIME_WINDOW_MS = 30 * 60 * 1000; // 30 minutos

const WEIGHTS = {
  reference: 0.45,
  amount: 0.4,
  timeWindow: 0.15,
};

const EXACT_MATCH_THRESHOLD = 0.85;
const PROBABLE_MATCH_THRESHOLD = 0.5;
const AMBIGUOUS_MATCH_THRESHOLD = 0.3;

/**
 * Sección 9 del roadmap. IMPORTANTE: el contrato con quien llama
 * (`PaymentVerificationService`) es que `candidates` ya viene filtrado
 * a movimientos de la cuenta correcta que TODAVÍA no tienen un
 * PaymentSubmission asociado (`matchedMovementId` es la unique
 * constraint que finalmente lo garantiza a nivel de BD). Este servicio
 * no vuelve a consultar la base de datos — es lógica pura, fácil de
 * testear con datos sintéticos.
 *
 * Deliberadamente reglas determinísticas, no ML (sección 24): con los
 * campos disponibles (referencia, monto, fecha) unas reglas ponderadas
 * ya cubren los casos reales; entrenar un modelo sin datos históricos
 * suficientes sería sobreingeniería.
 */
@Injectable()
export class ReconciliationEngineService {
  match(
    extracted: ExtractedReceiptData,
    candidates: Movement[],
    timeWindowMs: number = DEFAULT_TIME_WINDOW_MS,
  ): ReconciliationOutcome {
    // "No encontré el movimiento" (todavía) ≠ "el comprobante es falso".
    // Ver sección 10 del roadmap — este es exactamente ese caso.
    if (candidates.length === 0) {
      return { result: MatchResult.PENDING, score: 0, movementId: null, candidates: [] };
    }

    const scored = candidates
      .map((movement) => this.score(extracted, movement, timeWindowMs))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const secondBest = scored[1];

    // Dos candidatos casi empatados en score son, por definición,
    // ambiguos: no hay evidencia para preferir uno sobre otro.
    const tooCloseToCall = !!secondBest && best.score - secondBest.score < 0.1;

    let result: MatchResult;
    if (best.score >= EXACT_MATCH_THRESHOLD && best.referenceMatch && best.amountMatch && !tooCloseToCall) {
      result = MatchResult.EXACT_MATCH;
    } else if (best.score >= PROBABLE_MATCH_THRESHOLD && best.amountMatch && !tooCloseToCall) {
      result = MatchResult.PROBABLE_MATCH;
    } else if (best.score >= AMBIGUOUS_MATCH_THRESHOLD || tooCloseToCall) {
      result = MatchResult.AMBIGUOUS_MATCH;
    } else {
      result = MatchResult.NO_MATCH;
    }

    const movementId = result === MatchResult.EXACT_MATCH ? best.movement.id : null;

    return { result, score: best.score, movementId, candidates: scored };
  }

  private score(
    extracted: ExtractedReceiptData,
    movement: Movement,
    timeWindowMs: number,
  ): ReconciliationCandidateScore {
    const referenceMatch = this.referencesMatch(extracted.reference, movement.reference);
    const amountMatch = this.amountsMatch(extracted.amount, Number(movement.amount));
    const timeWindowMatch = this.withinTimeWindow(extracted.occurredAt, movement.date, timeWindowMs);

    const score =
      (referenceMatch ? WEIGHTS.reference : 0) +
      (amountMatch ? WEIGHTS.amount : 0) +
      (timeWindowMatch ? WEIGHTS.timeWindow : 0);

    return { movement, score, referenceMatch, amountMatch, timeWindowMatch };
  }

  private referencesMatch(a: string | undefined, b: string): boolean {
    if (!a || !b) return false;
    return this.normalizeReference(a) === this.normalizeReference(b);
  }

  private normalizeReference(value: string): string {
    return value.trim().toLowerCase().replace(/[\s-]+/g, '');
  }

  private amountsMatch(a: number | undefined, b: number): boolean {
    if (a === undefined || a === null || Number.isNaN(b)) return false;
    // Tolerancia de 1 centavo para evitar falsos negativos por
    // redondeo de punto flotante entre lo que reporta el OCR y el
    // Decimal(18,2) de la base de datos.
    return Math.abs(a - b) < 0.01;
  }

  private withinTimeWindow(a: Date | undefined, b: Date, windowMs: number): boolean {
    if (!a) return false;
    return Math.abs(a.getTime() - b.getTime()) <= windowMs;
  }
}
