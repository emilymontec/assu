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

  it('propaga la configuración de proxy cuando está definida (IP dedicada/residencial)', () => {
    const registry = new AdapterRegistryService();
    registry.register('nequi', FakeAdapter);
    const proxy = { server: 'http://proxy.example.com:8000', username: 'user', password: 'pass' };
    const configService = makeConfigService({ 'playwright.proxy': proxy });
    const factory = new AdapterFactoryService(registry, configService);

    const adapter = factory.create('nequi') as unknown as FakeAdapter;

    expect((adapter.options as { proxy?: unknown }).proxy).toEqual(proxy);
  });

  it('propaga el error de adapterKey desconocido', () => {
    const registry = new AdapterRegistryService();
    const factory = new AdapterFactoryService(registry, makeConfigService({}));

    expect(() => factory.create('desconocido')).toThrow(/no hay ningún adapter registrado/i);
  });

  it('en modo docker devuelve un DockerIsolatedAdapter en vez de instanciar la clase real', () => {
    const registry = new AdapterRegistryService();
    registry.register('nequi', FakeAdapter);
    const configService = makeConfigService({
      'scraperIsolation.mode': 'docker',
      'scraperIsolation.dockerImage': 'assu-backend-scraper:latest',
      'scraperIsolation.containerTimeoutMs': 45000,
    });
    const factory = new AdapterFactoryService(registry, configService);

    const adapter = factory.create('nequi');

    expect(adapter).not.toBeInstanceOf(FakeAdapter);
    expect(adapter.constructor.name).toBe('DockerIsolatedAdapter');
  });

  it('en modo docker SÍ valida que el adapterKey exista antes de devolver el proxy', () => {
    const registry = new AdapterRegistryService(); // nada registrado
    const configService = makeConfigService({ 'scraperIsolation.mode': 'docker' });
    const factory = new AdapterFactoryService(registry, configService);

    expect(() => factory.create('banco-inexistente')).toThrow(/no hay ningún adapter registrado/i);
  });
});
