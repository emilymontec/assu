import { BankCredentials } from '../ports/bank-adapter.interface';
import { RawMovement } from '../domain/movement/movement.entity';

const mockPage = { close: jest.fn().mockResolvedValue(undefined) };
const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  setDefaultTimeout: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  cookies: jest.fn().mockResolvedValue([]),
};
const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined),
};
const launchMock = jest.fn().mockResolvedValue(mockBrowser);

jest.mock('playwright', () => ({
  chromium: { launch: (...args: unknown[]) => launchMock(...args) },
}));

// eslint-disable-next-line import/first
import { PlaywrightAdapterBase, PlaywrightAdapterOptions } from './playwright-adapter.base';

/** Subclase mínima solo para poder instanciar la clase abstracta en el test. */
class TestAdapter extends PlaywrightAdapterBase {
  constructor(options: PlaywrightAdapterOptions) {
    super(options);
  }
  async login(_credentials: BankCredentials): Promise<void> {
    await this.openBrowser();
  }
  async sync(): Promise<RawMovement[]> {
    return [];
  }
}

describe('PlaywrightAdapterBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza chromium SIN proxy cuando no hay ninguno configurado', async () => {
    const adapter = new TestAdapter({ headless: true, timeoutMs: 5000 });
    await adapter.login({});

    expect(launchMock).toHaveBeenCalledWith({ headless: true });
  });

  it('lanza chromium CON la config de proxy (IP dedicada/residencial) cuando está presente', async () => {
    const proxy = { server: 'http://proxy.example.com:8000', username: 'user', password: 'pass' };
    const adapter = new TestAdapter({ headless: true, timeoutMs: 5000, proxy });
    await adapter.login({});

    expect(launchMock).toHaveBeenCalledWith({ headless: true, proxy });
  });

  it('logout() es seguro de llamar incluso si nunca se abrió el navegador', async () => {
    const adapter = new TestAdapter({ headless: true, timeoutMs: 5000 });
    await expect(adapter.logout()).resolves.toBeUndefined();
  });
});
