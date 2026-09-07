import { MovementStatus } from './movement-status.enum';
import { MovementType } from './movement-type.enum';

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
    public readonly rawData: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}

  fingerprint(): string {
    return `${this.accountId}:${this.reference || 'NO_REF'}:${this.amount}:${this.date.toISOString().slice(0, 10)}`;
  }
}

export type RawMovement = Record<string, unknown>;
