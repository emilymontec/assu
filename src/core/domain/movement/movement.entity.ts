import { MovementStatus } from './movement-status.enum';
import { MovementType } from './movement-type.enum';

/**
 * Formato estándar de movimiento bancario, independiente del banco de origen.
 * Todo `RawMovement` que sale de un CollectorAdapter debe pasar por el
 * Movement Parser antes de convertirse en esto.
 */
export class Movement {
  constructor(
    public readonly id: string,
    public readonly accountId: string,
    public reference: string,
    public amount: number,
    public currency: string,
    public sender: string | null,
    public receiver: string | null,
    public movementType: MovementType,
    public date: Date,
    public status: MovementStatus,
    public verified: boolean,
    /** Payload original del banco, conservado para auditoría/debug del parser. */
    public readonly rawData: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}

  /** Clave usada para deduplicación cuando no hay referencia confiable. */
  fingerprint(): string {
    return `${this.accountId}:${this.reference || 'NO_REF'}:${this.amount}:${this.date.toISOString().slice(0, 10)}`;
  }
}

/**
 * Movimiento tal cual lo entrega el adapter del banco, sin normalizar.
 * Su forma varía completamente de un banco a otro; por eso es un tipo abierto.
 */
export type RawMovement = Record<string, unknown>;
