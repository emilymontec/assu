import { Module } from '@nestjs/common';
import { ReconciliationEngineService } from './reconciliation-engine.service';

@Module({
  providers: [ReconciliationEngineService],
  exports: [ReconciliationEngineService],
})
export class ReconciliationEngineModule {}
