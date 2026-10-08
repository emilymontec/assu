import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import type { Message } from 'telegraf/types';

export type TelegramIncomingMessage = Message.PhotoMessage | Message.DocumentMessage;

/**
 * Encapsula todo el ciclo de vida del bot de Telegram. Es la ÚNICA
 * clase del sistema que conoce `telegraf` directamente —
 * `ReceiptIngestionService` (para recibir) y `TelegramResponderAdapter`
 * (para responder) hablan con este servicio, nunca con `Telegraf`
 * directamente. Si algún día se cambia de canal, solo este archivo y
 * `TelegramResponderAdapter` deberían cambiar (mismo principio que
 * aplicaba antes con `OpenWaClientService`).
 *
 * A diferencia de open-wa, Telegram usa la Bot API oficial de Telegram
 * (gratuita, sin límite de mensajes, sin riesgo de bloqueo por
 * automatización): no hay sesión de navegador que mantener viva ni QR
 * que escanear. El bot se autentica con un token fijo (`TELEGRAM_BOT_TOKEN`)
 * obtenido una sola vez vía @BotFather.
 *
 * Modo de arranque: `launch()` usa long-polling por defecto (no
 * requiere HTTPS público ni dominio) — suficiente para producción en
 * volúmenes moderados. Si más adelante se necesita escalar a múltiples
 * instancias del backend, se puede migrar a `launch({ webhook: {...} })`
 * sin tocar el resto de este módulo.
 */
@Injectable()
export class TelegramClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramClientService.name);
  private bot: Telegraf | null = null;
  private ready!: Promise<Telegraf>;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const token = this.configService.get<string>('telegram.botToken');

    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN no configurado; el bot de Telegram no se iniciará (el resto de Assu funciona igual).',
      );
      this.ready = Promise.reject(new Error('TELEGRAM_BOT_TOKEN no configurado'));
      this.ready.catch(() => undefined); // evita unhandledRejection, el error real se loguea donde se consuma
      return;
    }

    const bot = new Telegraf(token);

    this.ready = bot
      .launch({ dropPendingUpdates: true })
      .then(() => {
        this.bot = bot;
        this.logger.log('Bot de Telegram listo (long-polling).');
        return bot;
      })
      .catch((err) => {
        this.logger.error(`No se pudo iniciar el bot de Telegram: ${err}`);
        throw err;
      });

    // No se espera aquí (`await this.ready`) a propósito: igual que con
    // open-wa, el arranque del resto de Assu (detección de movimientos,
    // API interna, etc.) no debe depender de que Telegram esté listo.
    this.ready.catch(() => undefined);
  }

  /** Se resuelve cuando el bot está autenticado y escuchando (long-polling activo). */
  whenReady(): Promise<Telegraf> {
    return this.ready;
  }

  async onMessage(handler: (message: TelegramIncomingMessage) => void): Promise<void> {
    const bot = await this.whenReady();
    bot.on('photo', (ctx) => handler(ctx.message as Message.PhotoMessage));
    bot.on('document', (ctx) => handler(ctx.message as Message.DocumentMessage));
  }

  async sendText(chatId: string | number, text: string): Promise<void> {
    const bot = await this.whenReady();
    await bot.telegram.sendMessage(chatId, text);
  }

  /**
   * Descarga el archivo de mayor resolución de una foto, o el documento
   * adjunto, y lo devuelve como buffer + mime type. A diferencia de
   * open-wa (que entrega el adjunto ya descifrado como data URL),
   * Telegram expone una URL temporal (`getFileLink`) que hay que
   * descargar manualmente — no hay cifrado E2E que descifrar porque
   * Telegram Bot API no usa el cifrado de Telegram "secret chats".
   */
  async downloadMedia(message: TelegramIncomingMessage): Promise<{ buffer: Buffer; mimeType: string }> {
    const bot = await this.whenReady();

    const fileId =
      'photo' in message
        ? message.photo[message.photo.length - 1].file_id // última = mayor resolución
        : message.document.file_id;

    const mimeType = 'document' in message ? message.document.mime_type ?? 'application/octet-stream' : 'image/jpeg';

    const fileLink = await bot.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.toString());
    if (!response.ok) {
      throw new Error(`No se pudo descargar el adjunto de Telegram (HTTP ${response.status}).`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mimeType };
  }

  async onModuleDestroy(): Promise<void> {
    this.bot?.stop('Assu shutting down');
  }
}
