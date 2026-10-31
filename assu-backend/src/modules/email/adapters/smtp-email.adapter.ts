import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { EmailMessage, EmailPort } from '../../../core/ports/email.port';

/**
 * EmailPort real sobre SMTP (nodemailer) — funciona con cualquier
 * proveedor que hable SMTP: Resend, SES, Mailgun, Gmail con contraseña
 * de aplicación, etc. Solo se instancia el transporte si
 * EMAIL_PROVIDER=smtp (ver EmailModule); si falta algún SMTP_* con el
 * provider en 'smtp', env.validation.ts ya rechaza el arranque antes de
 * llegar aquí.
 */
@Injectable()
export class SmtpEmailAdapter implements EmailPort, OnModuleInit {
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (this.configService.get<string>('email.provider') !== 'smtp') {
      return;
    }
    this.transporter = createTransport({
      host: this.configService.get<string>('email.smtp.host'),
      port: this.configService.get<number>('email.smtp.port'),
      secure: this.configService.get<number>('email.smtp.port') === 465,
      auth: {
        user: this.configService.get<string>('email.smtp.user'),
        pass: this.configService.get<string>('email.smtp.password'),
      },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('SmtpEmailAdapter.send() llamado sin transporte inicializado (EMAIL_PROVIDER != smtp)');
      return;
    }
    await this.transporter.sendMail({
      from: this.configService.get<string>('email.from'),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
