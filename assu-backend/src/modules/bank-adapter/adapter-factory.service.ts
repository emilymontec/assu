import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdapterRegistryService } from './adapter-registry.service';
import { CollectorAdapter } from '../../core/ports/collector-adapter.interface';
import { PlaywrightAdapterOptions, PlaywrightProxyOptions } from '../../core/base/playwright-adapter.base';
import { DockerIsolatedAdapter } from './adapters/docker-isolated.adapter';

@Injectable()
export class AdapterFactoryService {
  constructor(
    private readonly registry: AdapterRegistryService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Crea una instancia NUEVA del adapter en cada llamada — a propósito.
   * Un adapter mantiene estado mutable (browser/context/page abiertos, o
   * en modo docker, la sesión exportada entre contenedores), así que
   * nunca debe ser un singleton compartido entre cuentas o entre syncs.
   *
   * `LoginManagerService`/`SyncEngineService` reciben siempre un
   * `CollectorAdapter` — no saben ni les importa si por debajo corre
   * Playwright en este proceso o en un contenedor Docker desechable.
   */
  create(adapterKey: string): CollectorAdapter {
    // Se valida igual en ambos modos: si el banco no está registrado,
    // el error debe ser el mismo sin importar dónde vaya a correr.
    const AdapterCtor = this.registry.resolve(adapterKey);

    const isolationMode = this.configService.get<string>('scraperIsolation.mode') ?? 'in-process';
    if (isolationMode === 'docker') {
      return new DockerIsolatedAdapter(adapterKey, {
        image: this.configService.get<string>('scraperIsolation.dockerImage') ?? 'assu-backend-scraper:latest',
        timeoutMs: this.configService.get<number>('scraperIsolation.containerTimeoutMs') ?? 45000,
        network: this.configService.get<string | undefined>('scraperIsolation.dockerNetwork'),
      });
    }

    const options: PlaywrightAdapterOptions = {
      headless: this.configService.get<boolean>('playwright.headless') ?? true,
      timeoutMs: this.configService.get<number>('playwright.timeoutMs') ?? 30000,
      proxy: this.configService.get<PlaywrightProxyOptions | undefined>('playwright.proxy'),
    };
    return new AdapterCtor(options);
  }
}
