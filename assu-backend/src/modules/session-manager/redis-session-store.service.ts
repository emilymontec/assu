import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { SessionStorePort, StoredSession } from '../../core/ports/session-store.port';
import { REDIS_CLIENT } from '../../database/redis.module';

const KEY_PREFIX = 'session:';

@Injectable()
export class RedisSessionStoreService implements SessionStorePort, OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(accountId: string): string {
    return `${KEY_PREFIX}${accountId}`;
  }

  async get(accountId: string): Promise<StoredSession | null> {
    const raw = await this.redis.get(this.key(accountId));
    return raw ? this.deserialize(raw) : null;
  }

  /**
   * El TTL de la clave en Redis se calcula a partir de `expiresAt`, así que
   * Redis mismo borra la sesión al vencerse — no depende de que nadie más
   * la limpie manualmente.
   */
  async save(session: StoredSession): Promise<void> {
    const ttlSeconds = Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000);
    if (ttlSeconds <= 0) {
      throw new Error(
        `No se puede guardar una sesión ya vencida para la cuenta ${session.accountId} (expiresAt en el pasado)`,
      );
    }
    await this.redis.set(this.key(session.accountId), JSON.stringify(session), 'EX', ttlSeconds);
  }

  async invalidate(accountId: string): Promise<void> {
    await this.redis.del(this.key(accountId));
  }

  isExpired(session: StoredSession): boolean {
    return session.expiresAt.getTime() <= Date.now();
  }

  /** Red de seguridad además del TTL nativo (ver `save()`): útil si algo se guardó alguna vez sin TTL. */
  async cleanupExpired(): Promise<number> {
    let cursor = '0';
    let removed = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', `${KEY_PREFIX}*`, 'COUNT', 100);
      cursor = nextCursor;

      for (const key of keys) {
        const raw = await this.redis.get(key);
        if (!raw) continue;

        const session = this.deserialize(raw);
        if (this.isExpired(session)) {
          await this.redis.del(key);
          removed += 1;
        }
      }
    } while (cursor !== '0');

    return removed;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private deserialize(raw: string): StoredSession {
    const parsed = JSON.parse(raw) as StoredSession;
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      expiresAt: new Date(parsed.expiresAt),
    };
  }
}
