import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../database/redis.module';
import { DomainEvent, EventPublisherPort } from '../../core/ports/event-publisher.port';

const MAX_ATTEMPTS = 2;

@Injectable()
export class RedisEventPublisherService implements EventPublisherPort {
  private readonly logger = new Logger(RedisEventPublisherService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Publica en un Redis Stream (XADD) — MVP según el roadmap, con espacio
   * para migrar a RabbitMQ cuando haya más consumidores. Reintenta una vez
   * antes de darse por vencido; si el segundo intento también falla, se
   * propaga el error para que Sync Engine decida qué hacer (hoy: el
   * movimiento ya quedó guardado, pero el evento no se publicó — eso se
   * queda registrado en el log de error del propio Sync Engine).
   */
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const streamName = this.configService.get<string>('events.streamName') ?? 'collector.movements';
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.redis.xadd(
          streamName,
          '*',
          'name',
          event.name,
          'version',
          event.version,
          'occurredAt',
          event.occurredAt.toISOString(),
          'payload',
          JSON.stringify(event.payload),
        );
        return;
      } catch (err) {
        lastError = err;
        this.logger.warn(`Intento ${attempt}/${MAX_ATTEMPTS} fallido publicando "${event.name}": ${err}`);
      }
    }

    this.logger.error(`No se pudo publicar el evento "${event.name}" tras ${MAX_ATTEMPTS} intentos`);
    throw lastError;
  }
}
