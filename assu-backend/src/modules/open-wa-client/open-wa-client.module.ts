import { Module } from '@nestjs/common';
import { OpenWaClientService } from './open-wa-client.service';

/**
 * Módulo "hoja" (sin imports de otros módulos de negocio), igual que
 * `PaymentSubmissionPersistenceModule` — así tanto
 * `ReceiptChannelResponderModule` (para responder) como
 * `ReceiptIngestionModule` (para recibir) pueden importarlo sin crear
 * un ciclo entre ellos.
 */
@Module({
  providers: [OpenWaClientService],
  exports: [OpenWaClientService],
})
export class OpenWaClientModule {}
