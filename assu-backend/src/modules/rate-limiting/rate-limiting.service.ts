import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitExceededError } from '../../common/errors/transient.error';

const BANK_WINDOW_SECONDS = 60;

@Injectable()
export class RateLimitingService {
  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cubre "limitar consultas por banco" + "evitar exceso de solicitudes" +
   * "aplicar límites específicos por adapter": todas las cuentas de un
   * mismo banco (identificadas por `adapterKey`) comparten el mismo
   * contador, así que 10 cuentas de Nequi sincronizando a la vez no
   * superan, entre todas, el límite pensado para UN banco.
   *
   * El límite hoy es global (mismo número para todos los bancos) — un
   * límite específico POR banco requeriría agregarlo como campo en la
   * entidad `Bank`, algo razonable si en el futuro se necesita (algunos
   * bancos toleran más tráfico que otros).
   */
  async checkBankLimit(adapterKey: string): Promise<void> {
    const limit = this.configService.get<number>('rateLimiting.maxRequestsPerBankPerMinute') ?? 20;
    const allowed = await this.rateLimiter.checkAndConsume(`bank:${adapterKey}`, limit, BANK_WINDOW_SECONDS);
    if (!allowed) {
      throw new RateLimitExceededError(
        `Se alcanzó el límite de ${limit} solicitudes/minuto para el banco "${adapterKey}"`,
      );
    }
  }

  /**
   * Cubre "limitar consultas por cuenta": protege contra `POST /sync`
   * repetido en ráfaga para la MISMA cuenta, algo que `syncIntervalSeconds`
   * (Scheduler) no cubre porque el sync manual no pasa por el Scheduler.
   */
  async checkAccountLimit(accountId: string): Promise<void> {
    const minSeconds = this.configService.get<number>('rateLimiting.minSecondsBetweenAccountSyncs') ?? 10;
    const allowed = await this.rateLimiter.checkAndConsume(`account:${accountId}`, 1, minSeconds);
    if (!allowed) {
      throw new RateLimitExceededError(
        `La cuenta ${accountId} ya se sincronizó hace menos de ${minSeconds}s; espera antes de reintentar`,
      );
    }
  }
}
