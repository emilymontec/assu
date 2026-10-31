import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * `JwtService`/`JwtAuthGuard` los necesitan tanto AuthModule (para
 * firmar el token al completar un login) como NotificationsModule (su
 * controller está protegido con `JwtAuthGuard`, porque cada comercio
 * solo ve sus propias notificaciones). Si AuthModule importara
 * NotificationsModule (para MERCHANT_NOTIFIER_PORT) Y NotificationsModule
 * importara AuthModule (para el guard), sería un ciclo. Este módulo
 * `@Global()` es el punto neutral: se registra una vez en AppModule y
 * ambos lo usan sin depender entre sí.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: { expiresIn: configService.get<string>('auth.jwtExpiresIn') ?? '12h' },
      }),
    }),
  ],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthSharedModule {}
