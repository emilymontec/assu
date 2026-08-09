export const SESSION_STORE_PORT = Symbol('SESSION_STORE_PORT');

export interface StoredSession {
  accountId: string;
  cookies: Record<string, unknown>[];
  tokens: Record<string, string>;
  createdAt: Date;
  expiresAt: Date;
}

/** Implementado por el módulo Session Manager (Redis). */
export interface SessionStorePort {
  get(accountId: string): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  invalidate(accountId: string): Promise<void>;
  isExpired(session: StoredSession): boolean;
}
