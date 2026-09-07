import { Module } from '@nestjs/common';
import { SESSION_STORE_PORT } from '../../core/ports/session-store.port';
import { SessionManagerService } from './session-manager.service';
import { RedisSessionStoreService } from './redis-session-store.service';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  // RedisModule es @Global(), así que REDIS_CLIENT ya está disponible sin
  // importarlo explícitamente — pero se importa igual por claridad.
  imports: [ObservabilityModule],
  providers: [
    RedisSessionStoreService,
    // useExisting: SESSION_STORE_PORT y RedisSessionStoreService resuelven
    // a la MISMA instancia — el resto del sistema depende del contrato
    // (core/ports/session-store.port.ts), nunca de la clase concreta.
    { provide: SESSION_STORE_PORT, useExisting: RedisSessionStoreService },
    SessionManagerService,
  ],
  // Login Manager / Sync Engine (módulos 4/7) inyectarán SessionManagerService.
  exports: [SessionManagerService],
})
export class SessionManagerModule {}

