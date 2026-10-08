import { PlaywrightAdapterOptions } from '../core/base/playwright-adapter.base';
import { BankAdapter } from '../core/ports/bank-adapter.interface';
import { NequiAdapter } from '../modules/bank-adapter/adapters/nequi/nequi.adapter';
import { BancolombiaAdapter } from '../modules/bank-adapter/adapters/bancolombia/bancolombia.adapter';
import { DaviplataAdapter } from '../modules/bank-adapter/adapters/daviplata/daviplata.adapter';

export type AdapterConstructor = new (options: PlaywrightAdapterOptions) => BankAdapter;

/**
 * Fuente única de verdad de qué `adapterKey` mapea a qué clase.
 *
 * La usan dos consumidores que NO deben desincronizarse:
 *  1. `bank-adapter.module.ts` — registra cada entrada en
 *     `AdapterRegistryService` para el modo `in-process` (default).
 *  2. `src/scraper-worker/entrypoint.ts` — el binario standalone que
 *     corre DENTRO del contenedor desechable cuando
 *     `SCRAPER_ISOLATION_MODE=docker` está activo (ver
 *     `DockerIsolatedAdapter`). Ese proceso no tiene NestJS ni el resto
 *     de Assu cargado — solo esto.
 *
 * Agregar un banco nuevo: una línea acá alcanza para que quede
 * disponible en AMBOS modos de ejecución.
 */
export const ADAPTER_MAP: Record<string, AdapterConstructor> = {
  nequi: NequiAdapter,
  bancolombia: BancolombiaAdapter,
  daviplata: DaviplataAdapter,
};
