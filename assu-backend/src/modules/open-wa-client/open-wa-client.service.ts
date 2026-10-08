import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create, Client, Message, ChatId, DataURL } from '@open-wa/wa-automate';

/**
 * Encapsula todo el ciclo de vida del cliente de open-wa. Es la ÚNICA
 * clase del sistema que conoce `@open-wa/wa-automate` directamente —
 * `ReceiptIngestionService` (para recibir) y `WhatsAppResponderAdapter`
 * (para responder) hablan con este servicio, nunca con el `Client` de
 * open-wa de forma directa. Si algún día se cambia de open-wa a
 * WhatsApp Cloud API (o viceversa, como ya pasó en este proyecto), solo
 * este archivo y `WhatsAppResponderAdapter` deberían cambiar.
 *
 * A diferencia de un webhook HTTP (WhatsApp Cloud API), open-wa
 * mantiene una sesión de WhatsApp Web viva dentro del propio proceso de
 * Collector (vía Puppeteer). Eso implica:
 *  - Requiere escanear un QR la primera vez (con `OPENWA_HEADLESS=false`
 *    para poder verlo).
 *  - La sesión se guarda en disco y se reutiliza en arranques
 *    posteriores — no hay "webhook" que Meta pueda re-verificar.
 *  - Solo puede haber UN número de WhatsApp por sesión/proceso.
 */
@Injectable()
export class OpenWaClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpenWaClientService.name);
  private client: Client | null = null;
  private ready!: Promise<Client>;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const sessionId = this.configService.get<string>('openWa.sessionId') ?? 'assu-backend';
    const headless = this.configService.get<boolean>('openWa.headless') ?? true;

    this.ready = create({
      sessionId,
      headless,
      qrTimeout: 0, // 0 = sin límite; espera lo que haga falta a que se escanee el QR la primera vez
      authTimeout: 60,
      cacheEnabled: false,
      popup: false,
      logConsole: false,
      disableSpins: true,
    }).then((client) => {
      this.client = client;
      this.logger.log(`Cliente de WhatsApp (open-wa) listo — sesión "${sessionId}".`);
      return client;
    });

    // No se espera aquí (`await this.ready`) a propósito: si el QR no
    // se ha escaneado todavía, esta promesa puede tardar minutos, y no
    // debe bloquear el arranque del resto de Collector (detección de
    // movimientos, API interna, etc.) — esos módulos no dependen de
    // WhatsApp para nada.
    this.ready.catch((err) => {
      this.logger.error(`No se pudo iniciar el cliente de WhatsApp (open-wa): ${err}`);
    });
  }

  /** Se resuelve cuando la sesión de WhatsApp está autenticada y lista para usarse. */
  whenReady(): Promise<Client> {
    return this.ready;
  }

  async onMessage(handler: (message: Message) => void): Promise<void> {
    const client = await this.whenReady();
    client.onMessage(handler);
  }

  async sendText(to: ChatId, text: string): Promise<void> {
    const client = await this.whenReady();
    await client.sendText(to, text);
  }

  /** Descifra el adjunto de un mensaje (imagen/documento) a un data URL (`data:<mime>;base64,<...>`). */
  async decryptMedia(message: Message): Promise<DataURL> {
    const client = await this.whenReady();
    return client.decryptMedia(message);
  }

  async onModuleDestroy(): Promise<void> {
    await (this.client as any)?.kill('Collector shutting down');
  }
}
