import { Inject, Injectable } from '@nestjs/common';
import { SESSION_STORE_PORT, SessionStorePort, StoredSession } from '../../core/ports/session-store.port';
import { MetricsService } from '../observability/metrics.service';

/** 30 minutos por defecto; cada banco puede pasar su propio TTL si su sesión real dura distinto. */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class SessionManagerService {
  constructor(
    @Inject(SESSION_STORE_PORT) private readonly store: SessionStorePort,
    private readonly metricsService: MetricsService,
  ) {}

  /** Cubre "evitar logins innecesarios": Login Manager debe llamar esto ANTES de intentar login(). */
  async hasValidSession(accountId: string): Promise<boolean> {
    const session = await this.store.get(accountId);
    if (!session) return false;
    if (this.store.isExpired(session)) {
      this.metricsService.recordSessionExpired();
      return false;
    }
    return true;
  }

  async getValidSession(accountId: string): Promise<StoredSession | null> {
    const session = await this.store.get(accountId);
    if (!session) {
      return null;
    }
    if (this.store.isExpired(session)) {
      this.metricsService.recordSessionExpired();
      return null;
    }
    return session;
  }

  async createSession(
    accountId: string,
    cookies: Record<string, unknown>[],
    tokens: Record<string, string>,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<StoredSession> {
    const now = new Date();
    const session: StoredSession = {
      accountId,
      cookies,
      tokens,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    };
    await this.store.save(session);
    return session;
  }

  /** Extiende una sesión existente (ej. tras confirmar que sigue viva sin necesidad de un login completo). */
  async renew(
    accountId: string,
    updates: Partial<Pick<StoredSession, 'cookies' | 'tokens'>> = {},
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<StoredSession> {
    const existing = await this.store.get(accountId);
    if (!existing) {
      throw new Error(`No hay sesión guardada para la cuenta ${accountId}; usa createSession() en vez de renew()`);
    }

    const renewed: StoredSession = {
      ...existing,
      ...updates,
      expiresAt: new Date(Date.now() + ttlMs),
    };
    await this.store.save(renewed);
    return renewed;
  }

  async invalidate(accountId: string): Promise<void> {
    await this.store.invalidate(accountId);
  }

  /** Solo hace algo real si el store subyacente lo soporta (Redis sí; un fake de test puede no hacerlo). */
  async cleanupExpiredSessions(): Promise<number> {
    if (this.store.cleanupExpired) {
      return this.store.cleanupExpired();
    }
    return 0;
  }
}
