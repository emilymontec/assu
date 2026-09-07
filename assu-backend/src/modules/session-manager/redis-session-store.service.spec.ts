import { RedisSessionStoreService } from './redis-session-store.service';
import { StoredSession } from '../../core/ports/session-store.port';

function makeFakeRedis() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    quit: jest.fn(),
  };
}

function makeSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    accountId: 'acc-1',
    cookies: [{ name: 'sid', value: 'abc' }],
    tokens: { access: 'tok-123' },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

describe('RedisSessionStoreService', () => {
  it('save() calcula el TTL en segundos a partir de expiresAt y lo guarda con EX', async () => {
    const redis = makeFakeRedis();
    const store = new RedisSessionStoreService(redis as any);
    const session = makeSession({ expiresAt: new Date(Date.now() + 120_000) });

    await store.save(session);

    expect(redis.set).toHaveBeenCalledTimes(1);
    const [key, value, mode, ttl] = redis.set.mock.calls[0];
    expect(key).toBe('session:acc-1');
    expect(JSON.parse(value)).toMatchObject({ accountId: 'acc-1' });
    expect(mode).toBe('EX');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(120);
  });

  it('save() rechaza guardar una sesión ya vencida', async () => {
    const redis = makeFakeRedis();
    const store = new RedisSessionStoreService(redis as any);
    const session = makeSession({ expiresAt: new Date(Date.now() - 1000) });

    await expect(store.save(session)).rejects.toThrow(/ya vencida/i);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('get() devuelve null si la clave no existe en Redis', async () => {
    const redis = makeFakeRedis();
    redis.get.mockResolvedValue(null);
    const store = new RedisSessionStoreService(redis as any);

    const result = await store.get('acc-1');

    expect(result).toBeNull();
    expect(redis.get).toHaveBeenCalledWith('session:acc-1');
  });

  it('get() deserializa las fechas correctamente (no las deja como string)', async () => {
    const redis = makeFakeRedis();
    const session = makeSession();
    redis.get.mockResolvedValue(JSON.stringify(session));
    const store = new RedisSessionStoreService(redis as any);

    const result = await store.get('acc-1');

    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.expiresAt).toBeInstanceOf(Date);
    expect(result?.expiresAt.getTime()).toBe(new Date(session.expiresAt).getTime());
  });

  it('invalidate() borra la clave correcta', async () => {
    const redis = makeFakeRedis();
    const store = new RedisSessionStoreService(redis as any);

    await store.invalidate('acc-1');

    expect(redis.del).toHaveBeenCalledWith('session:acc-1');
  });

  it('isExpired() compara expiresAt contra el reloj actual', () => {
    const redis = makeFakeRedis();
    const store = new RedisSessionStoreService(redis as any);

    expect(store.isExpired(makeSession({ expiresAt: new Date(Date.now() - 1) }))).toBe(true);
    expect(store.isExpired(makeSession({ expiresAt: new Date(Date.now() + 60_000) }))).toBe(false);
  });

  it('cleanupExpired() recorre todas las páginas del SCAN y borra solo las sesiones vencidas', async () => {
    const redis = makeFakeRedis();
    const expired = makeSession({ accountId: 'expired-1', expiresAt: new Date(Date.now() - 1000) });
    const valid = makeSession({ accountId: 'valid-1', expiresAt: new Date(Date.now() + 60_000) });

    // Simula un SCAN paginado: primera llamada devuelve cursor "5" (hay más), segunda devuelve "0" (fin).
    redis.scan
      .mockResolvedValueOnce(['5', ['session:expired-1']])
      .mockResolvedValueOnce(['0', ['session:valid-1']]);
    redis.get.mockImplementation((key: string) => {
      if (key === 'session:expired-1') return Promise.resolve(JSON.stringify(expired));
      if (key === 'session:valid-1') return Promise.resolve(JSON.stringify(valid));
      return Promise.resolve(null);
    });

    const store = new RedisSessionStoreService(redis as any);
    const removed = await store.cleanupExpired();

    expect(removed).toBe(1);
    expect(redis.del).toHaveBeenCalledWith('session:expired-1');
    expect(redis.del).not.toHaveBeenCalledWith('session:valid-1');
    expect(redis.scan).toHaveBeenCalledTimes(2);
  });

  it('onModuleDestroy() cierra la conexión de Redis', async () => {
    const redis = makeFakeRedis();
    const store = new RedisSessionStoreService(redis as any);

    await store.onModuleDestroy();

    expect(redis.quit).toHaveBeenCalledTimes(1);
  });
});
