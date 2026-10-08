import { PaymentSubmissionStatus } from './payment-submission-status.enum';
import { MatchResult } from './match-result.enum';
import { OcrConfidence } from './ocr-confidence.enum';
import { ExtractedReceiptData } from './extracted-receipt-data';

export type SubmissionChannel = 'TELEGRAM' | 'API';

export class PaymentSubmission {
  constructor(
    public readonly id: string,
    public readonly channel: SubmissionChannel,
    public readonly externalMessageId: string | null,
    public readonly senderIdentifier: string,
    public bankAccountId: string | null,
    public readonly fileHash: string,
    public readonly fileStorageRef: string,
    public readonly fileMimeType: string,
    public status: PaymentSubmissionStatus,
    public ocrExtractedData: ExtractedReceiptData | null,
    public ocrConfidence: OcrConfidence | null,
    public matchedMovementId: string | null,
    public matchResult: MatchResult | null,
    public matchScore: number | null,
    public rejectionReason: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  /** Un comprobante ya resuelto no debe volver a procesarse automáticamente. */
  isTerminal(): boolean {
    return (
      this.status === PaymentSubmissionStatus.VERIFIED ||
      this.status === PaymentSubmissionStatus.REJECTED
    );
  }
}
