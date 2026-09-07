import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdapterRegistryService } from './adapter-registry.service';
import { CollectorAdapter } from '../../core/ports/collector-adapter.interface';
import { PlaywrightAdapterOptions } from '../../core/base/playwright-adapter.base';

@Injectable()
export class AdapterFactoryService {
  constructor(
    private readonly registry: AdapterRegistryService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Crea una instancia NUEVA del adapter en cada llamada — a propósito.
   * Un adapter mantiene estado mutable (browser/context/page abiertos), así
   * que nunca debe ser un singleton compartido entre cuentas o entre syncs.
   */
  create(adapterKey: string): CollectorAdapter {
    const AdapterCtor = this.registry.resolve(adapterKey);
    const options: PlaywrightAdapterOptions = {
      headless: this.configService.get<boolean>('playwright.headless') ?? true,
      timeoutMs: this.configService.get<number>('playwright.timeoutMs') ?? 30000,
    };
    return new AdapterCtor(options);
  }
}
