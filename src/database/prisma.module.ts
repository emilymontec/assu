import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global(): cualquier módulo puede inyectar PrismaService sin re-importar
 * este módulo. Los repositorios concretos de cada módulo (Bank, Movement,
 * SyncLog, etc.) lo consumirán a medida que se vayan agregando.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
