import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { ChatId, Message, MessageTypes } from '@open-wa/wa-automate';
import { OpenWaClientService } from '../open-wa-client/open-wa-client.service';
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

const RECEIPT_MESSAGE_TYPES = [MessageTypes.IMAGE, MessageTypes.DOCUMENT] as const;

/**
 * Orquesta la ingesta desde WhatsApp vía open-wa: escucha mensajes
 * entrantes, descarga y valida el adjunto, crea el `PaymentSubmission`
 * de forma idempotente y encola su procesamiento.
 *
 * Nota de arquitectura frente a la versión anterior (WhatsApp Cloud
 * API): ya no hay un webhook HTTP público — `onModuleInit` se suscribe
 * directamente a los mensajes de la sesión de open-wa a través de
 * `OpenWaClientService`. Por eso ya no existe
 * `WhatsAppSignatureGuard`/`whatsapp-webhook.controller.ts`: no hay
 * nada externo que pueda "llamar" a este endpoint para falsificar un
 * webhook, porque no hay endpoint — el propio proceso de Collector es
 * el cliente de WhatsApp.
 */
@Injectable()
export class ReceiptIngestionService implements OnModuleInit {
  private readonly logger = new Logger(ReceiptIngestionService.name);

  constructor(
    private readonly openWaClientService: OpenWaClientService,
    private readonly receiptProcessingService: ReceiptProcessingService,
    private readonly paymentVerificationService: PaymentVerificationService,
    private readonly configService: ConfigService,
    @Inject(RECEIPT_STORAGE_PORT) private readonly storage: ReceiptStoragePort,
    @Inject(RECEIPT_CHANNEL_RESPONDER_PORT) private readonly responder: ReceiptChannelResponderPort,
    @InjectQueue(RECEIPT_PROCESSING_QUEUE_NAME) private readonly queue: Queue<ReceiptProcessingJobData>,
  ) {}

  async onModuleInit(): Promise<void> {
    // No se espera (`await`) a que el cliente esté listo — `onMessage`
    // internamente espera (`whenReady()`) sin bloquear el arranque del
    // resto del módulo ni de Collector.
    void this.openWaClientService.onMessage((message) => {
      this.handleIncomingMessage(message).catch((err) => {
        this.logger.error(`Fallo no controlado procesando mensaje de WhatsApp ${message.id}: ${err}`);
      });
    });
  }

  private async handleIncomingMessage(message: Message): Promise<void> {
    // Ignora eco de mensajes enviados por la propia sesión (por ejemplo,
    // las confirmaciones que este mismo bot manda) y cualquier mensaje
    // que no traiga una imagen/documento — no todo mensaje entrante es
    // un comprobante.
    if (message.fromMe || !message.isMedia) return;
    if (!RECEIPT_MESSAGE_TYPES.includes(message.type as (typeof RECEIPT_MESSAGE_TYPES)[number])) return;

    const bankAccountId = this.configService.get<string>('openWa.bankAccountId');
    if (!bankAccountId) {
      this.logger.error(
        'OPENWA_BANK_ACCOUNT_ID no está configurado; se ignora el comprobante recibido porque no hay ' +
          'forma de saber contra qué cuenta bancaria conciliarlo.',
      );
      return;
    }

    try {
      const dataUrl = await this.openWaClientService.decryptMedia(message);
      const { buffer, mimeType } = this.parseDataUrl(dataUrl);

      this.receiptProcessingService.validateFile(buffer, mimeType);
      const fileHash = this.receiptProcessingService.computeFileHash(buffer);

      // Se genera el id ANTES de crear el registro para poder guardar
      // el archivo bajo ese mismo id y persistir la referencia real de
      // una sola vez (ver nota equivalente en la versión anterior de
      // este servicio, con Cloud API: el motivo no cambió).
      const submissionId = randomUUID();
      const storageRef = await this.storage.store(buffer, mimeType, submissionId);

      const { wasCreated } = await this.paymentVerificationService.createFromReceipt({
        id: submissionId,
        channel: 'WHATSAPP',
        externalMessageId: message.id,
        senderIdentifier: message.from,
        bankAccountId,
        fileHash,
        fileStorageRef: storageRef,
        fileMimeType: mimeType,
      });

      if (!wasCreated) {
        this.logger.log(`Mensaje ${message.id} ya procesado antes (evento duplicado); se ignora.`);
        return;
      }

      await this.queue.add(
        RECEIPT_PROCESSING_JOB_NAME,
        { submissionId },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      await this.safeNotify(message.from, 'Recibimos tu comprobante, lo estamos verificando. Te avisaremos en unos minutos.');
    } catch (err) {
      if (err instanceof InvalidReceiptFileError) {
        this.logger.warn(`Archivo inválido de ${this.mask(message.from)}: ${err.message}`);
        await this.safeNotify(
          message.from,
          'El archivo que enviaste no pudo procesarse (formato o tamaño no soportado). Intenta con una foto o PDF más liviano.',
        );
        return;
      }
      this.logger.error(`Fallo procesando adjunto de WhatsApp (mensaje ${message.id}): ${err}`);
      // No se crea el submission si ni siquiera se pudo descifrar/validar
      // el archivo — no hay nada que rastrear como ERROR todavía.
    }
  }

  /** open-wa entrega el adjunto ya descifrado como data URL (`data:<mime>;base64,<...>`), no como buffer directo. */
  private parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      throw new Error('No se pudo interpretar el adjunto recibido de WhatsApp (formato de data URL inesperado).');
    }
    return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
  }

  private async safeNotify(recipient: ChatId, message: string): Promise<void> {
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
