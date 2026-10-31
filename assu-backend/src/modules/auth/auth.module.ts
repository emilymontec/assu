import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TrustedDeviceRepository } from './repositories/trusted-device.repository';
import { LoginChallengeRepository } from './repositories/login-challenge.repository';
import { MerchantModule } from '../merchant/merchant.module';
import { NotificationModule } from '../notifications/notification.module';
import { EmailModule } from '../email/email.module';
import { AuthSharedModule } from './auth-shared.module';

@Module({
  // NotificationModule provee MERCHANT_NOTIFIER_PORT (notifica "nuevo
  // acceso" al completar el segundo factor); EmailModule provee EMAIL_PORT
  // (envía el código de 6 dígitos); AuthSharedModule provee JwtService
  // para firmar la sesión — es @Global(), así que esta importación es
  // solo por claridad, no estrictamente necesaria.
  imports: [MerchantModule, NotificationModule, EmailModule, AuthSharedModule],
  controllers: [AuthController],
  providers: [AuthService, TrustedDeviceRepository, LoginChallengeRepository],
})
export class AuthModule {}
