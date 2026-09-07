import { Injectable, Logger } from '@nestjs/common';
import { CollectorAdapter } from '../../core/ports/collector-adapter.interface';
import { PlaywrightAdapterOptions } from '../../core/base/playwright-adapter.base';

export type AdapterConstructor = new (options: PlaywrightAdapterOptions) => CollectorAdapter;

/**
 * El único lugar del sistema donde se traduce `bank.adapterKey` (un
 * string guardado en la tabla `banks`) a una clase de TypeScript real.
 * Para agregar un banco nuevo: crear su adapter en `adapters/<banco>/` y
 * añadir una línea `registry.register('<adapterKey>', SuAdapter)` en
 * `bank-adapter.module.ts` — nada más del sistema necesita cambiar.
 */
@Injectable()
export class AdapterRegistryService {
  private readonly logger = new Logger(AdapterRegistryService.name);
  private readonly adapters = new Map<string, AdapterConstructor>();

  register(adapterKey: string, ctor: AdapterConstructor): void {
    if (this.adapters.has(adapterKey)) {
      this.logger.warn(`El adapterKey "${adapterKey}" ya estaba registrado; se sobreescribe.`);
    }
    this.adapters.set(adapterKey, ctor);
  }

  resolve(adapterKey: string): AdapterConstructor {
    const ctor = this.adapters.get(adapterKey);
    if (!ctor) {
      const available = [...this.adapters.keys()].join(', ') || '(ninguno)';
      throw new Error(
        `No hay ningún adapter registrado para adapterKey "${adapterKey}". Adapters disponibles: ${available}`,
      );
    }
    return ctor;
  }

  listRegisteredKeys(): string[] {
    return [...this.adapters.keys()];
  }
}
