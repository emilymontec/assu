import { Module, OnModuleInit } from '@nestjs/common';
import { AdapterRegistryService } from './adapter-registry.service';
import { AdapterFactoryService } from './adapter-factory.service';
import { ADAPTER_MAP } from '../../scraper-worker/adapter-map';

@Module({
  providers: [AdapterRegistryService, AdapterFactoryService],
  // Login Manager / Sync Engine (módulos 4/7) inyectarán AdapterFactoryService
  // para obtener el adapter correcto según bank.adapterKey.
  exports: [AdapterFactoryService, AdapterRegistryService],
})
export class BankAdapterModule implements OnModuleInit {
  constructor(private readonly registry: AdapterRegistryService) {}

  onModuleInit(): void {
    // La lista de bancos vive en un solo lugar (ADAPTER_MAP) para que el
    // modo in-process (acá) y el modo docker (scraper-worker/entrypoint.ts)
    // nunca queden desincronizados. Para agregar un banco nuevo: una
    // entrada en ADAPTER_MAP alcanza para ambos modos.
    for (const [adapterKey, adapterClass] of Object.entries(ADAPTER_MAP)) {
      this.registry.register(adapterKey, adapterClass);
    }
  }
}
