import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReceiptProcessingService } from './receipt-processing.service';
import { FraudDetectionService } from './fraud-detection.service';
import { NullOcrAdapter } from './adapters/null-ocr.adapter';
import { TesseractOcrAdapter } from './adapters/tesseract-ocr.adapter';
import { LocalReceiptStorageAdapter } from './adapters/storage/local-receipt-storage.adapter';
import { OCR_PORT, OcrPort } from '../../core/ports/ocr.port';
import { RECEIPT_STORAGE_PORT } from '../../core/ports/receipt-storage.port';
import { PaymentSubmissionPersistenceModule } from '../payment-verification/payment-submission-persistence.module';

@Module({
  imports: [PaymentSubmissionPersistenceModule],
  providers: [
    ReceiptProcessingService,
    FraudDetectionService,
    NullOcrAdapter,
    TesseractOcrAdapter,
    LocalReceiptStorageAdapter,
    {
      provide: OCR_PORT,
      inject: [ConfigService, NullOcrAdapter, TesseractOcrAdapter],
      // OCR_PROVIDER=tesseract activa el OCR real; cualquier otro valor
      // (o ausencia de la variable) deja el placeholder honesto. Así se
      // puede desplegar sin OCR real configurado sin que nada se rompa
      // — todo cae en MANUAL_REVIEW, nunca en un falso VERIFIED.
      useFactory: (configService: ConfigService, nullAdapter: NullOcrAdapter, tesseractAdapter: TesseractOcrAdapter): OcrPort =>
        configService.get<string>('ocr.provider') === 'tesseract' ? tesseractAdapter : nullAdapter,
    },
    { provide: RECEIPT_STORAGE_PORT, useClass: LocalReceiptStorageAdapter },
  ],
  exports: [ReceiptProcessingService, FraudDetectionService, RECEIPT_STORAGE_PORT],
})
export class ReceiptProcessingModule {}
