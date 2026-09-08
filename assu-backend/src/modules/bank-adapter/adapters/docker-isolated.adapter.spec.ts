const runScraperContainerMock = jest.fn();

jest.mock('../docker-container-runner', () => ({
  runScraperContainer: (...args: unknown[]) => runScraperContainerMock(...args),
}));

// eslint-disable-next-line import/first
import { DockerIsolatedAdapter } from './docker-isolated.adapter';

describe('DockerIsolatedAdapter', () => {
  const dockerConfig = { image: 'assu-backend-scraper:latest', timeoutMs: 45000 };

  beforeEach(() => {
    runScraperContainerMock.mockReset();
  });

  it('login() manda action="login" con las credenciales y guarda la sesión devuelta', async () => {
    runScraperContainerMock.mockResolvedValue({ ok: true, session: { cookies: [{ name: 'a' }], tokens: {} } });
    const adapter = new DockerIsolatedAdapter('nequi', dockerConfig);

    await adapter.login({ phone: '300', pin: '1234' });

    expect(runScraperContainerMock).toHaveBeenCalledWith(dockerConfig, {
      action: 'login',
      adapterKey: 'nequi',
      credentials: { phone: '300', pin: '1234' },
    });
    await expect(adapter.exportSession()).resolves.toEqual({ cookies: [{ name: 'a' }], tokens: {} });
  });

  it('sync() manda la sesión guardada por login() (contenedor nuevo, mismo estado)', async () => {
    runScraperContainerMock.mockResolvedValueOnce({ ok: true, session: { cookies: [{ name: 'a' }], tokens: {} } });
    const adapter = new DockerIsolatedAdapter('nequi', dockerConfig);
    await adapter.login({ phone: '300', pin: '1234' });

    runScraperContainerMock.mockResolvedValueOnce({ ok: true, movements: [{ referencia: 'ref-1' }] });
    const movements = await adapter.sync('ref-0');

    expect(runScraperContainerMock).toHaveBeenLastCalledWith(dockerConfig, {
      action: 'sync',
      adapterKey: 'nequi',
      session: { cookies: [{ name: 'a' }], tokens: {} },
      sincePointer: 'ref-0',
    });
    expect(movements).toEqual([{ referencia: 'ref-1' }]);
  });

  it('restoreSession() permite retomar una sesión guardada en Redis sin haber llamado login() en este objeto', async () => {
    const adapter = new DockerIsolatedAdapter('nequi', dockerConfig);
    await adapter.restoreSession({ cookies: [{ name: 'previa' }], tokens: { csrf: 'x' } });

    runScraperContainerMock.mockResolvedValue({ ok: true, movements: [] });
    await adapter.sync();

    expect(runScraperContainerMock).toHaveBeenCalledWith(
      dockerConfig,
      expect.objectContaining({ session: { cookies: [{ name: 'previa' }], tokens: { csrf: 'x' } } }),
    );
  });

  it('logout() manda la sesión actual y limpia el estado en memoria', async () => {
    runScraperContainerMock.mockResolvedValueOnce({ ok: true, session: { cookies: [], tokens: {} } });
    const adapter = new DockerIsolatedAdapter('nequi', dockerConfig);
    await adapter.login({ phone: '300', pin: '1234' });

    runScraperContainerMock.mockResolvedValueOnce({ ok: true });
    await adapter.logout();

    await expect(adapter.exportSession()).resolves.toEqual({ cookies: [], tokens: {} });
  });

  it('exportSession() devuelve un objeto vacío por defecto si nunca hubo login/restoreSession', async () => {
    const adapter = new DockerIsolatedAdapter('nequi', dockerConfig);

    await expect(adapter.exportSession()).resolves.toEqual({ cookies: [], tokens: {} });
  });

  it('sync() sin login previo manda session=null (el contenedor decide qué hacer con eso)', async () => {
    runScraperContainerMock.mockResolvedValue({ ok: true, movements: [] });
    const adapter = new DockerIsolatedAdapter('nequi', dockerConfig);

    await adapter.sync();

    expect(runScraperContainerMock).toHaveBeenCalledWith(dockerConfig, expect.objectContaining({ session: null }));
  });

  it('propaga el error si el contenedor falla (runScraperContainer ya lanza la clase de error correcta)', async () => {
    runScraperContainerMock.mockRejectedValue(new Error('credenciales inválidas'));
    const adapter = new DockerIsolatedAdapter('nequi', dockerConfig);

    await expect(adapter.login({ phone: '300', pin: 'mal' })).rejects.toThrow('credenciales inválidas');
  });
});
