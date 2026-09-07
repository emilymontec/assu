import { Module, OnModuleInit } from '@nestjs/common';
import { MovementParserRegistryService } from './movement-parser-registry.service';
import { MovementParserService } from './movement-parser.service';
import { parseNequiMovement } from './parsers/nequi.parser';

@Module({
  providers: [MovementParserRegistryService, MovementParserService],
  exports: [MovementParserService],
})
export class MovementParserModule implements OnModuleInit {
  constructor(private readonly registry: MovementParserRegistryService) {}

  onModuleInit(): void {
    // Para agregar un banco nuevo: crear su parser en parsers/<banco>.parser.ts
    // y registrar una línea aquí con el mismo adapterKey usado en Bank Management.
    this.registry.register('nequi', parseNequiMovement);
  }
}
