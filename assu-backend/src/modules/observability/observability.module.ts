import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  // Sync Engine, Queue (SyncProcessor) y Session Manager inyectan
  // MetricsService para reportar sus eventos. No importa nada de esos
  // módulos — evita cualquier riesgo de dependencia circular.
  exports: [MetricsService],
})
export class ObservabilityModule {}
