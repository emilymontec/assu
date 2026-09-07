import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MOVEMENT_REPOSITORY_PORT, MovementFilters, MovementRepositoryPort } from '../../core/ports/movement-repository.port';
import { Movement } from '../../core/domain/movement/movement.entity';

@Injectable()
export class MovementService {
  constructor(@Inject(MOVEMENT_REPOSITORY_PORT) private readonly repository: MovementRepositoryPort) {}

  /** Usado por Sync Engine (módulo 7) para persistir un movimiento ya parseado, validado y no-duplicado. */
  async create(movement: Movement): Promise<Movement> {
    return this.repository.create(movement);
  }

  async findAll(filters: MovementFilters): Promise<Movement[]> {
    return this.repository.findMany(filters);
  }

  async findById(id: string): Promise<Movement> {
    const movement = await this.repository.findById(id);
    if (!movement) {
      throw new NotFoundException(`Movimiento ${id} no encontrado`);
    }
    return movement;
  }
}
