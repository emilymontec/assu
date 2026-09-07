import { SessionManagerService } from './session-manager.service';
import { SessionStorePort, StoredSession } from '../../core/ports/session-store.port';

function makeSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    accountId: 'acc-1',
    cookies: [],
    tokens: {},
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

describe('SessionManagerService', () => {
  const store: jest.Mocked<SessionStorePort> = {
    get: jest.fn(),
    save: jest.fn(),
    invalidate: jest.fn(),
    isExpired: jest.fn(),
    cleanupExpired: jest.fn(),
  };
  const metricsService = { recordSessionExpired: jest.fn() };

  function buildService() {
    return new SessionManagerService(store, metricsService as any);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    metricsService.recordSessionExpired.mockClear();
  });

  it('hasValidSession devuelve false si no hay sesión guardada', async () => {
    store.get.mockResolvedValue(null);
    const service = buildService();

    expect(await service.hasValidSession('acc-1')).toBe(false);
  });

  it('hasValidSession devuelve false si la sesión existe pero está vencida', async () => {
    store.get.mockResolvedValue(makeSession());
    store.isExpired.mockReturnValue(true);
    const service = buildService();

    expect(await service.hasValidSession('acc-1')).toBe(false);
    expect(metricsService.recordSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('hasValidSession devuelve true si hay una sesión vigente (evita logins innecesarios) y no cuenta como expirada', async () => {
    store.get.mockResolvedValue(makeSession());
    store.isExpired.mockReturnValue(false);
    const service = buildService();

    expect(await service.hasValidSession('acc-1')).toBe(true);
    expect(metricsService.recordSessionExpired).not.toHaveBeenCalled();
  });

  it('hasValidSession NO cuenta como "expirada" el caso de que simplemente no exista sesión', async () => {
    store.get.mockResolvedValue(null);
    const service = buildService();

    await service.hasValidSession('acc-1');

    expect(metricsService.recordSessionExpired).not.toHaveBeenCalled();
  });

  it('getValidSession devuelve null si la sesión está vencida, en vez de devolverla igual, y lo contabiliza en métricas', async () => {
    store.get.mockResolvedValue(makeSession());
    store.isExpired.mockReturnValue(true);
    const service = buildService();

    expect(await service.getValidSession('acc-1')).toBeNull();
    expect(metricsService.recordSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('createSession arma la sesión con el TTL indicado y la persiste', async () => {
    const service = buildService();

    const session = await service.createSession('acc-1', [{ n: 1 }], { access: 'tok' }, 10_000);

    expect(store.save).toHaveBeenCalledWith(session);
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(10_000);
  });

  it('renew() lanza un error claro si no existe sesión previa', async () => {
    store.get.mockResolvedValue(null);
    const service = buildService();

    await expect(service.renew('acc-1')).rejects.toThrow(/no hay sesión guardada/i);
    expect(store.save).not.toHaveBeenCalled();
  });

  it('renew() actualiza cookies/tokens y extiende expiresAt desde el momento de la renovación', async () => {
    const existing = makeSession({ tokens: { access: 'viejo' }, expiresAt: new Date(Date.now() + 1000) });
    store.get.mockResolvedValue(existing);
    const service = buildService();

    const before = Date.now();
    const renewed = await service.renew('acc-1', { tokens: { access: 'nuevo' } }, 5_000);

    expect(renewed.tokens).toEqual({ access: 'nuevo' });
    expect(renewed.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 5_000);
    expect(store.save).toHaveBeenCalledWith(renewed);
  });

  it('invalidate() delega directamente en el store', async () => {
    const service = buildService();

    await service.invalidate('acc-1');

    expect(store.invalidate).toHaveBeenCalledWith('acc-1');
  });

  it('cleanupExpiredSessions() delega en el store si este lo soporta', async () => {
    (store.cleanupExpired as jest.Mock).mockResolvedValue(3);
    const service = buildService();

    expect(await service.cleanupExpiredSessions()).toBe(3);
  });

  it('cleanupExpiredSessions() devuelve 0 si el store no implementa la limpieza (método opcional)', async () => {
    const storeWithoutCleanup: SessionStorePort = {
      get: jest.fn(),
      save: jest.fn(),
      invalidate: jest.fn(),
      isExpired: jest.fn(),
      // sin cleanupExpired
    };
    const service = new SessionManagerService(storeWithoutCleanup, metricsService as any);

    expect(await service.cleanupExpiredSessions()).toBe(0);
  });
});
