import { Movement } from '../domain/movement/movement.entity';

export const MOVEMENT_REPOSITORY_PORT = Symbol('MOVEMENT_REPOSITORY_PORT');

export interface MovementFilters {
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  verified?: boolean;
  /**
   * Cuando es true, excluye movimientos que ya tienen un
   * PaymentSubmission asociado (`matched_movement_id`). Lo usa
   * ReconciliationEngineService a través de PaymentVerificationService
   * para nunca ofrecer como candidato un movimiento que ya fue usado
   * para verificar otro comprobante — la garantía final la da igual la
   * unique constraint en BD, esto solo evita intentarlo.
   */
  excludeAlreadyMatched?: boolean;
}

export interface MovementRepositoryPort {
  create(movement: Movement): Promise<Movement>;
  existsByFingerprint(accountId: string, reference: string, amount: number, date: Date): Promise<boolean>;
  findMany(filters: MovementFilters): Promise<Movement[]>;
  findById(id: string): Promise<Movement | null>;
}
