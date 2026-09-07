import { ConfigService } from '@nestjs/config';
import { AdapterFactoryService } from './adapter-factory.service';
import { AdapterRegistryService } from './adapter-registry.service';

class FakeAdapter {
  constructor(public options: unknown) {}
  async login(): Promise<void> {}
  async sync(): Promise<never[]> {
    return [];
  }
  async logout(): Promise<void> {}
}

function makeConfigService(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('AdapterFactoryService', () => {
  it('instancia el adapter correcto con las opciones de Playwright desde config', () => {
    const registry = new AdapterRegistryService();
    registry.register('nequi', FakeAdapter);
    const configService = makeConfigService({ 'playwright.headless': false, 'playwright.timeoutMs': 15000 });
    const factory = new AdapterFactoryService(registry, configService);

    const adapter = factory.create('nequi') as unknown as FakeAdapter;

    expect(adapter).toBeInstanceOf(FakeAdapter);
    expect(adapter.options).toEqual({ headless: false, timeoutMs: 15000 });
  });

  it('usa valores por defecto (headless=true, timeout 30s) si la config no los tiene', () => {
    const registry = new AdapterRegistryService();
    registry.register('nequi', FakeAdapter);
    const configService = makeConfigService({});
    const factory = new AdapterFactoryService(registry, configService);

    const adapter = factory.create('nequi') as unknown as FakeAdapter;

    expect(adapter.options).toEqual({ headless: true, timeoutMs: 30000 });
  });

  it('crea una instancia NUEVA en cada llamada (nunca reutiliza estado entre cuentas)', () => {
    const registry = new AdapterRegistryService();
    registry.register('nequi', FakeAdapter);
    const factory = new AdapterFactoryService(registry, makeConfigService({}));

    const first = factory.create('nequi');
    const second = factory.create('nequi');

    expect(first).not.toBe(second);
  });

  it('propaga el error de adapterKey desconocido', () => {
    const registry = new AdapterRegistryService();
    const factory = new AdapterFactoryService(registry, makeConfigService({}));

    expect(() => factory.create('desconocido')).toThrow(/no hay ningún adapter registrado/i);
  });
});
