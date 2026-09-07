export const SESSION_STORE_PORT = Symbol('SESSION_STORE_PORT');

export interface StoredSession {
  accountId: string;
  cookies: Record<string, unknown>[];
  tokens: Record<string, string>;
  createdAt: Date;
  expiresAt: Date;
}

export interface SessionStorePort {
  get(accountId: string): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  invalidate(accountId: string): Promise<void>;
  isExpired(session: StoredSession): boolean;
  /**
   * Opcional: barrido manual de sesiones vencidas. La implementación de
   * Redis ya expira las claves por TTL de forma nativa (ver `save()`),
   * así que esto es una red de seguridad, no el mecanismo principal.
   * Otros backends (ej. uno en memoria para tests) pueden no implementarlo.
   */
  cleanupExpired?(): Promise<number>;
}
