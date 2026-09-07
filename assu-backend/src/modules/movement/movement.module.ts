import { Module } from '@nestjs/common';
import { MOVEMENT_REPOSITORY_PORT } from '../../core/ports/movement-repository.port';
import { MovementController } from './movement.controller';
import { MovementService } from './movement.service';
import { MovementRepository } from './repositories/movement.repository';

@Module({
  controllers: [MovementController],
  providers: [
    MovementRepository,
    // El resto del sistema (Sync Engine, Movement Deduplication) depende
    // del contrato MOVEMENT_REPOSITORY_PORT, nunca de MovementRepository directamente.
    { provide: MOVEMENT_REPOSITORY_PORT, useExisting: MovementRepository },
    MovementService,
  ],
  exports: [MovementService, MOVEMENT_REPOSITORY_PORT],
})
export class MovementModule {}
