import { MovementType } from '../../core/domain/movement/movement-type.enum';
import { RawMovement } from '../../core/domain/movement/movement.entity';

/**
 * Campos ya normalizados, pero SIN los datos que le corresponde asignar
 * a Sync Engine (id, accountId, status, verified, rawData, createdAt).
 * `MovementParserFn` es puro: mismo raw → mismo resultado, sin efectos
 * secundarios ni acceso a red/DB.
 */
export interface ParsedMovementFields {
  reference: string;
  amount: number;
  currency: string;
  sender: string | null;
  receiver: string | null;
  movementType: MovementType;
  date: Date;
}

export type MovementParserFn = (raw: RawMovement) => ParsedMovementFields;
