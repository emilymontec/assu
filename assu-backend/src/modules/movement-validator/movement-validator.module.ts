import { Module } from '@nestjs/common';
import { MovementValidatorService } from './movement-validator.service';

@Module({
  providers: [MovementValidatorService],
  exports: [MovementValidatorService],
})
export class MovementValidatorModule {}
