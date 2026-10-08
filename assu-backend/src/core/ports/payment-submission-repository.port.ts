import { PaymentSubmission, SubmissionChannel } from '../domain/payment-verification/payment-submission.entity';
import { PaymentSubmissionStatus } from '../domain/payment-verification/payment-submission-status.enum';
import { VerificationEvent } from '../domain/payment-verification/verification-event.entity';

export const PAYMENT_SUBMISSION_REPOSITORY_PORT = Symbol('PAYMENT_SUBMISSION_REPOSITORY_PORT');

export interface CreateSubmissionData {
  id?: string;
  channel: SubmissionChannel;
  externalMessageId: string | null;
  senderIdentifier: string;
  bankAccountId: string | null;
  fileHash: string;
  fileStorageRef: string;
  fileMimeType: string;
}

export interface ListSubmissionsFilters {
  status?: PaymentSubmissionStatus;
  bankAccountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaymentSubmissionRepositoryPort {
  /**
   * Crea el submission de forma idempotente sobre (channel,
   * externalMessageId): si ya existe uno para ese mensaje, lo devuelve
   * tal cual en vez de duplicarlo. Es la defensa contra que Telegram
   * reintente la entrega del update (long-polling puede re-entregar el
   * mismo mensaje si el proceso se reinicia antes de confirmarlo).
   */
  createIfNotExists(data: CreateSubmissionData): Promise<{ submission: PaymentSubmission; wasCreated: boolean }>;

  findById(id: string): Promise<PaymentSubmission | null>;
  findMany(filters: ListSubmissionsFilters): Promise<PaymentSubmission[]>;

  /** ¿Ya existe algún submission previo con este hash de archivo? (reutilización de comprobante) */
  existsByFileHash(fileHash: string): Promise<boolean>;

  /**
   * Compare-and-swap: solo actualiza si el estado actual en base de
   * datos sigue siendo `expectedStatus`. Devuelve `false` si otro
   * proceso ya lo cambió mientras tanto (protección contra dos workers
   * procesando el mismo submission a la vez). Junto a esto también
   * inserta el `VerificationEvent` correspondiente, dentro de la misma
   * transacción.
   */
  transitionStatus(
    id: string,
    expectedStatus: PaymentSubmissionStatus,
    update: {
      toStatus: PaymentSubmissionStatus;
      reason: string | null;
      actor: string;
      ocrExtractedData?: unknown;
      ocrConfidence?: string | null;
      matchedMovementId?: string | null;
      matchResult?: string | null;
      matchScore?: number | null;
      rejectionReason?: string | null;
    },
  ): Promise<boolean>;

  listEvents(submissionId: string): Promise<VerificationEvent[]>;
}
