import { Movement } from '../domain/movement/movement.entity';

export const MOVEMENT_REPOSITORY_PORT = Symbol('MOVEMENT_REPOSITORY_PORT');

export interface MovementFilters {
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  verified?: boolean;
}

/** Implementado por el módulo Movement Management (Prisma). */
export interface MovementRepositoryPort {
  create(movement: Movement): Promise<Movement>;
  existsByFingerprint(accountId: string, reference: string, amount: number, date: Date): Promise<boolean>;
  findMany(filters: MovementFilters): Promise<Movement[]>;
  findById(id: string): Promise<Movement | null>;
}
