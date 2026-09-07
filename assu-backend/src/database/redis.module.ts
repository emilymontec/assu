import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Conexión de Redis compartida por cualquier módulo que la necesite
 * (Session Manager, Event Publisher, y a futuro Rate Limiting). Se
 * extrajo aquí en cuanto hubo un segundo consumidor real — antes de eso,
 * cada módulo tenía su propio provider local, lo cual era más simple
 * mientras solo había un usuario.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        }),
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
