import { Module, OnModuleInit } from '@nestjs/common';
import { AdapterRegistryService } from './adapter-registry.service';
import { AdapterFactoryService } from './adapter-factory.service';
import { NequiAdapter } from './adapters/nequi/nequi.adapter';

@Module({
  providers: [AdapterRegistryService, AdapterFactoryService],
  // Login Manager / Sync Engine (módulos 4/7) inyectarán AdapterFactoryService
  // para obtener el adapter correcto según bank.adapterKey.
  exports: [AdapterFactoryService, AdapterRegistryService],
})
export class BankAdapterModule implements OnModuleInit {
  constructor(private readonly registry: AdapterRegistryService) {}

  onModuleInit(): void {
    // Para agregar un banco nuevo: crear su adapter en adapters/<banco>/
    // (extendiendo PlaywrightAdapterBase) y añadir una línea aquí con el
    // mismo `adapterKey` que se usó al registrar el banco en Bank Management.
    this.registry.register('nequi', NequiAdapter);
  }
}
