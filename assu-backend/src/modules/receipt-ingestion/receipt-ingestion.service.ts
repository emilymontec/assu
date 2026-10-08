import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { TelegramClientService, TelegramIncomingMessage } from '../telegram-client/telegram-client.service';
import { ReceiptProcessingService } from '../receipt-processing/receipt-processing.service';
import { RECEIPT_STORAGE_PORT, ReceiptStoragePort } from '../../core/ports/receipt-storage.port';
import { RECEIPT_CHANNEL_RESPONDER_PORT, ReceiptChannelResponderPort } from '../../core/ports/receipt-channel-responder.port';
import { PaymentVerificationService } from '../payment-verification/payment-verification.service';
import {
  RECEIPT_PROCESSING_JOB_NAME,
  RECEIPT_PROCESSING_QUEUE_NAME,
  ReceiptProcessingJobData,
} from '../payment-verification/receipt-processing-queue.constants';
import { InvalidReceiptFileError } from '../receipt-processing/receipt-processing.errors';

/**
 * Orquesta la ingesta desde Telegram: escucha mensajes entrantes
 * (fotos/documentos), descarga y valida el adjunto, crea el
 * `PaymentSubmission` de forma idempotente y encola su procesamiento.
 *
 * Nota de arquitectura: igual que con open-wa antes, no hay un webhook
 * HTTP público — `onModuleInit` se suscribe directamente a los mensajes
 * del bot a través de `TelegramClientService` (long-polling). No hay
 * webhook controller que registrar porque no hay endpoint que
 * falsificar — el propio proceso de Assu es el cliente de Telegram.
 */
@Injectable()
export class ReceiptIngestionService implements OnModuleInit {
  private readonly logger = new Logger(ReceiptIngestionService.name);

  constructor(
    private readonly telegramClientService: TelegramClientService,
    private readonly receiptProcessingService: ReceiptProcessingService,
    private readonly paymentVerificationService: PaymentVerificationService,
    private readonly configService: ConfigService,
    @Inject(RECEIPT_STORAGE_PORT) private readonly storage: ReceiptStoragePort,
    @Inject(RECEIPT_CHANNEL_RESPONDER_PORT) private readonly responder: ReceiptChannelResponderPort,
    @InjectQueue(RECEIPT_PROCESSING_QUEUE_NAME) private readonly queue: Queue<ReceiptProcessingJobData>,
  ) {}

  async onModuleInit(): Promise<void> {
    // No se espera (`await`) a que el bot esté listo — `onMessage`
    // internamente espera (`whenReady()`) sin bloquear el arranque del
    // resto del módulo ni de Assu.
    void this.telegramClientService.onMessage((message) => {
      this.handleIncomingMessage(message).catch((err) => {
        this.logger.error(`Fallo no controlado procesando mensaje de Telegram ${message.message_id}: ${err}`);
      });
    });
  }

  private async handleIncomingMessage(message: TelegramIncomingMessage): Promise<void> {
    const bankAccountId = this.configService.get<string>('telegram.bankAccountId');
    if (!bankAccountId) {
      this.logger.error(
        'TELEGRAM_BANK_ACCOUNT_ID no está configurado; se ignora el comprobante recibido porque no hay ' +
          'forma de saber contra qué cuenta bancaria conciliarlo.',
      );
      return;
    }

    const chatId = String(message.chat.id);

    try {
      const { buffer, mimeType } = await this.telegramClientService.downloadMedia(message);

      this.receiptProcessingService.validateFile(buffer, mimeType);
      const fileHash = this.receiptProcessingService.computeFileHash(buffer);

      // Se genera el id ANTES de crear el registro para poder guardar
      // el archivo bajo ese mismo id y persistir la referencia real de
      // una sola vez.
      const submissionId = randomUUID();
      const storageRef = await this.storage.store(buffer, mimeType, submissionId);

      const { wasCreated } = await this.paymentVerificationService.createFromReceipt({
        id: submissionId,
        channel: 'TELEGRAM',
        externalMessageId: String(message.message_id),
        senderIdentifier: chatId,
        bankAccountId,
        fileHash,
        fileStorageRef: storageRef,
        fileMimeType: mimeType,
      });

      if (!wasCreated) {
        this.logger.log(`Mensaje ${message.message_id} ya procesado antes (evento duplicado); se ignora.`);
        return;
      }

      await this.queue.add(
        RECEIPT_PROCESSING_JOB_NAME,
        { submissionId },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      await this.safeNotify(chatId, 'Recibimos tu comprobante, lo estamos verificando. Te avisaremos en unos minutos.');
    } catch (err) {
      if (err instanceof InvalidReceiptFileError) {
        this.logger.warn(`Archivo inválido de ${this.mask(chatId)}: ${err.message}`);
        await this.safeNotify(
          chatId,
          'El archivo que enviaste no pudo procesarse (formato o tamaño no soportado). Intenta con una foto o PDF más liviano.',
        );
        return;
      }
      this.logger.error(`Fallo procesando adjunto de Telegram (mensaje ${message.message_id}): ${err}`);
      // No se crea el submission si ni siquiera se pudo descargar/validar
      // el archivo — no hay nada que rastrear como ERROR todavía.
    }
  }

  private async safeNotify(recipient: string, message: string): Promise<void> {
    try {
      await this.responder.respond(recipient, message);
    } catch (err) {
      this.logger.warn(`No se pudo enviar la confirmación de recepción a ${this.mask(recipient)}: ${err}`);
    }
  }

  private mask(identifier: string): string {
    return identifier.length <= 4 ? '***' : `***${identifier.slice(-4)}`;
  }
}
