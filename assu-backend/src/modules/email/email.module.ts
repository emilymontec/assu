import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PORT, EmailPort } from '../../core/ports/email.port';
import { ConsoleEmailAdapter } from './adapters/console-email.adapter';
import { SmtpEmailAdapter } from './adapters/smtp-email.adapter';

@Module({
  providers: [
    ConsoleEmailAdapter,
    SmtpEmailAdapter,
    {
      provide: EMAIL_PORT,
      inject: [ConfigService, ConsoleEmailAdapter, SmtpEmailAdapter],
      // EMAIL_PROVIDER=smtp envía de verdad; cualquier otro valor (o
      // ausencia, el default) deja el correo solo en el log — así se
      // puede levantar el Portal de Comercios sin credenciales SMTP.
      useFactory: (configService: ConfigService, console_: ConsoleEmailAdapter, smtp: SmtpEmailAdapter): EmailPort =>
        configService.get<string>('email.provider') === 'smtp' ? smtp : console_,
    },
  ],
  exports: [EMAIL_PORT],
})
export class EmailModule {}
