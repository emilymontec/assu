import { InvalidCredentialsError, PortalStructureChangedError } from '../../../../common/errors/permanent.error';

const mockPage = {
  goto: jest.fn(),
  fill: jest.fn(),
  selectOption: jest.fn(),
  click: jest.fn(),
  waitForSelector: jest.fn(),
  textContent: jest.fn(),
  $$eval: jest.fn(),
  screenshot: jest.fn().mockResolvedValue(Buffer.from('')),
  close: jest.fn().mockResolvedValue(undefined),
};
const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  setDefaultTimeout: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};
const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('playwright', () => ({
  chromium: { launch: jest.fn(() => Promise.resolve(mockBrowser)) },
}));

// eslint-disable-next-line import/first
import { BancolombiaAdapter } from './bancolombia.adapter';

/** El selector de error nunca "aparece": se queda pendiente y luego rechaza, como haría Playwright con un timeout real. */
function neverAppears() {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('selector no encontrado')), 20));
}

describe('BancolombiaAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildAdapter(): BancolombiaAdapter {
    return new BancolombiaAdapter({ headless: true, timeoutMs: 5000 });
  }

  it('hace login exitoso: selecciona tipo de documento, llena documento y clave', async () => {
    mockPage.waitForSelector.mockImplementation((selector: string) =>
      selector.includes('home') ? Promise.resolve({}) : neverAppears(),
    );
    const adapter = buildAdapter();

    await expect(
      adapter.login({ documentType: 'CC', documentNumber: '123456789', password: 'clave-secreta' }),
    ).resolves.toBeUndefined();

    expect(mockPage.selectOption).toHaveBeenCalledWith(expect.any(String), 'CC');
    expect(mockPage.fill).toHaveBeenCalledTimes(2);
    expect(mockPage.click).toHaveBeenCalledTimes(2); // continuar + enviar
  });

  it('usa "CC" por defecto si no se pasa documentType', async () => {
    mockPage.waitForSelector.mockImplementation((selector: string) =>
      selector.includes('home') ? Promise.resolve({}) : neverAppears(),
    );
    const adapter = buildAdapter();

    await adapter.login({ documentNumber: '123456789', password: 'clave-secreta' });

    expect(mockPage.selectOption).toHaveBeenCalledWith(expect.any(String), 'CC');
  });

  it('detecta credenciales inválidas y lanza InvalidCredentialsError', async () => {
    mockPage.waitForSelector.mockImplementation((selector: string) =>
      selector.includes('error') ? Promise.resolve({}) : neverAppears(),
    );
    mockPage.textContent.mockResolvedValue('Clave incorrecta');
    const adapter = buildAdapter();

    await expect(
      adapter.login({ documentNumber: '123456789', password: 'mala' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('lanza PortalStructureChangedError si ni éxito ni error aparecen', async () => {
    mockPage.waitForSelector.mockImplementation(() => neverAppears());
    const adapter = buildAdapter();

    await expect(
      adapter.login({ documentNumber: '123456789', password: 'clave-secreta' }),
    ).rejects.toThrow(PortalStructureChangedError);
  });

  it('captura evidencia (screenshot) cuando el login falla', async () => {
    mockPage.waitForSelector.mockImplementation(() => neverAppears());
    const adapter = buildAdapter();

    await expect(adapter.login({ documentNumber: '123456789', password: 'x' })).rejects.toThrow();
    expect(mockPage.screenshot).toHaveBeenCalled();
  });

  it('sync() lanza un error claro si se llama sin login previo', async () => {
    const adapter = buildAdapter();

    await expect(adapter.sync()).rejects.toThrow(/login/i);
  });

  it('sync() extrae movimientos y corta la lista justo antes del sincePointer', async () => {
    mockPage.waitForSelector.mockImplementation((selector: string) =>
      selector.includes('home') ? Promise.resolve({}) : neverAppears(),
    );
    const adapter = buildAdapter();
    await adapter.login({ documentNumber: '123456789', password: 'clave-secreta' });

    mockPage.waitForSelector.mockResolvedValue({});
    mockPage.$$eval.mockResolvedValue([
      { numeroReferencia: 'ref-3' },
      { numeroReferencia: 'ref-2' },
      { numeroReferencia: 'ref-1' },
    ]);

    const all = await adapter.sync();
    expect(all).toHaveLength(3);

    const sinceRef2 = await adapter.sync('ref-2');
    expect(sinceRef2).toEqual([{ numeroReferencia: 'ref-3' }]);
  });

  it('logout() cierra page/context/browser sin lanzar, incluso sin login previo', async () => {
    const adapter = buildAdapter();
    await expect(adapter.logout()).resolves.toBeUndefined();
  });
});
