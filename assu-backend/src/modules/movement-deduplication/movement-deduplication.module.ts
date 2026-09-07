import { Module } from '@nestjs/common';
import { MovementDeduplicationService } from './movement-deduplication.service';
import { MovementModule } from '../movement/movement.module';

@Module({
  imports: [MovementModule], // provee MOVEMENT_REPOSITORY_PORT
  providers: [MovementDeduplicationService],
  exports: [MovementDeduplicationService],
})
export class MovementDeduplicationModule {}
