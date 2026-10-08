import { Module } from '@nestjs/common';
import { TelegramClientService } from './telegram-client.service';

/**
 * Módulo "hoja" (sin imports de otros módulos de negocio), igual que
 * antes `OpenWaClientModule` — así tanto `ReceiptChannelResponderModule`
 * (para responder) como `ReceiptIngestionModule` (para recibir) pueden
 * importarlo sin crear un ciclo entre ellos.
 */
@Module({
  providers: [TelegramClientService],
  exports: [TelegramClientService],
})
export class TelegramClientModule {}
