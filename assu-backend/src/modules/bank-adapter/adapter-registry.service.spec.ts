import { AdapterRegistryService } from './adapter-registry.service';

class FakeAdapter {
  constructor(public options: unknown) {}
  async login(): Promise<void> {}
  async sync(): Promise<never[]> {
    return [];
  }
  async logout(): Promise<void> {}
}

describe('AdapterRegistryService', () => {
  it('registra y resuelve un adapter por su adapterKey', () => {
    const registry = new AdapterRegistryService();
    registry.register('fake-bank', FakeAdapter);

    expect(registry.resolve('fake-bank')).toBe(FakeAdapter);
  });

  it('lanza un error claro si el adapterKey no está registrado', () => {
    const registry = new AdapterRegistryService();

    expect(() => registry.resolve('inexistente')).toThrow(/no hay ningún adapter registrado/i);
  });

  it('listRegisteredKeys refleja todos los adapters registrados', () => {
    const registry = new AdapterRegistryService();
    registry.register('nequi', FakeAdapter);
    registry.register('bancolombia', FakeAdapter);

    expect(registry.listRegisteredKeys().sort()).toEqual(['bancolombia', 'nequi']);
  });

  it('permite sobreescribir un adapterKey ya registrado (con warning) sin lanzar', () => {
    const registry = new AdapterRegistryService();
    registry.register('nequi', FakeAdapter);

    expect(() => registry.register('nequi', FakeAdapter)).not.toThrow();
  });
});
