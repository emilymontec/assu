import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../database/redis.module';

const KEY_PREFIX = 'ratelimit:';

/**
 * Contador de ventana fija sobre Redis: `INCR` + `EXPIRE` en la primera
 * solicitud de la ventana. Es más simple que un sliding window o token
 * bucket, y suficiente para el objetivo real ("no saturar un banco") —
 * el caso límite de ráfagas justo en el borde de la ventana no importa
 * aquí tanto como en un rate limiter de cara al público.
 */
@Injectable()
export class RateLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Incrementa el contador de `key` y dice si TODAVÍA está dentro del
   * límite. El incremento ocurre siempre (aunque el resultado sea
   * "no permitido"), porque lo que se está contando es "intentos", no
   * "intentos exitosos" — así un cliente que insiste de todas formas
   * sigue sumando al contador y no logra esquivar el límite reintentando.
   */
  async checkAndConsume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const redisKey = `${KEY_PREFIX}${key}`;
    const current = await this.redis.incr(redisKey);
    if (current === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }
    return current <= limit;
  }
}
