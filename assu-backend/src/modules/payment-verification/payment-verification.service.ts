import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_SUBMISSION_REPOSITORY_PORT,
  PaymentSubmissionRepositoryPort,
  CreateSubmissionData,
  ListSubmissionsFilters,
} from '../../core/ports/payment-submission-repository.port';
import { MOVEMENT_REPOSITORY_PORT, MovementRepositoryPort } from '../../core/ports/movement-repository.port';
import { EVENT_PUBLISHER_PORT, EventPublisherPort } from '../../core/ports/event-publisher.port';
import { RECEIPT_CHANNEL_RESPONDER_PORT, ReceiptChannelResponderPort } from '../../core/ports/receipt-channel-responder.port';
import { RECEIPT_STORAGE_PORT, ReceiptStoragePort } from '../../core/ports/receipt-storage.port';
import { PaymentSubmission } from '../../core/domain/payment-verification/payment-submission.entity';
import { PaymentSubmissionStatus as S } from '../../core/domain/payment-verification/payment-submission-status.enum';
import { MatchResult } from '../../core/domain/payment-verification/match-result.enum';
import { OcrConfidence } from '../../core/domain/payment-verification/ocr-confidence.enum';
import { VerificationEvent } from '../../core/domain/payment-verification/verification-event.entity';
import { ExtractedReceiptData } from '../../core/domain/payment-verification/extracted-receipt-data';
import { ReceiptProcessingService } from '../receipt-processing/receipt-processing.service';
import { FraudDetectionService } from '../receipt-processing/fraud-detection.service';
import { ReconciliationEngineService } from '../reconciliation-engine/reconciliation-engine.service';
import { OcrProviderError } from '../receipt-processing/receipt-processing.errors';
import { INVALID_TRANSITION_MESSAGE, InvalidTransitionError, SYSTEM_TRANSITIONS, MANUAL_TRANSITIONS } from './payment-verification.constants';
import {
  PAYMENT_VERIFICATION_RESOLVED_EVENT,
  PAYMENT_VERIFICATION_RESOLVED_EVENT_VERSION,
} from './payment-verification-resolved.event';

const RECONCILIATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h de margen para buscar candidatos; el score fino de tiempo lo aplica ReconciliationEngineService

export interface IngestReceiptInput extends CreateSubmissionData {
  fileBuffer: Buffer;
}

@Injectable()
export class PaymentVerificationService {
  private readonly logger = new Logger(PaymentVerificationService.name);

  constructor(
    @Inject(PAYMENT_SUBMISSION_REPOSITORY_PORT)
    private readonly repository: PaymentSubmissionRepositoryPort,
    @Inject(MOVEMENT_REPOSITORY_PORT) private readonly movementRepository: MovementRepositoryPort,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: EventPublisherPort,
    @Inject(RECEIPT_CHANNEL_RESPONDER_PORT) private readonly responder: ReceiptChannelResponderPort,
    @Inject(RECEIPT_STORAGE_PORT) private readonly receiptStorage: ReceiptStoragePort,
    private readonly receiptProcessingService: ReceiptProcessingService,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly reconciliationEngine: ReconciliationEngineService,
  ) {}

  async createFromReceipt(
    data: CreateSubmissionData,
  ): Promise<{ submission: PaymentSubmission; wasCreated: boolean }> {
    return this.repository.createIfNotExists(data);
  }

  async findById(id: string): Promise<PaymentSubmission> {
    const submission = await this.repository.findById(id);
    if (!submission) throw new NotFoundException(`No existe el comprobante ${id}`);
    return submission;
  }

  async findMany(filters: ListSubmissionsFilters): Promise<PaymentSubmission[]> {
    return this.repository.findMany(filters);
  }

  async listEvents(id: string): Promise<VerificationEvent[]> {
    await this.findById(id); // 404 si no existe
    return this.repository.listEvents(id);
  }

  /**
   * Orquesta el flujo automático: OCR → esperar movimiento →
   * conciliación. Es SEGURO llamarlo más de una vez para el mismo
   * submission (reintentos de BullMQ, doble entrega del job): si ya
   * está en un estado terminal, es un no-op explícito — este es el
   * mecanismo real contra "verificar un comprobante más de una vez".
   */
  async process(submissionId: string): Promise<void> {
    const submission = await this.repository.findById(submissionId);
    if (!submission) {
      this.logger.warn(`process(): submission ${submissionId} no existe (¿job huérfano?)`);
      return;
    }

    if (submission.isTerminal()) {
      this.logger.log(`Submission ${submissionId} ya está en estado terminal (${submission.status}); no-op.`);
      return;
    }

    switch (submission.status) {
      case S.RECEIVED:
        await this.runOcrStep(submission);
        return;
      case S.PENDING_MOVEMENT:
      case S.MATCHING:
        await this.runReconciliationStep(submission);
        return;
      default:
        this.logger.warn(`process() llamado con submission ${submissionId} en estado ${submission.status}; nada que hacer automáticamente.`);
    }
  }

  private async runOcrStep(submission: PaymentSubmission): Promise<void> {
    const movedToProcessing = await this.repository.transitionStatus(submission.id, S.RECEIVED, {
      toStatus: S.PROCESSING,
      reason: 'Iniciando validación y OCR',
      actor: 'SYSTEM',
    });
    if (!movedToProcessing) return; // otro worker ya lo tomó

    try {
      const fileBuffer = await this.receiptStorage.read(submission.fileStorageRef);
      const ocrResult = await this.receiptProcessingService.extract(fileBuffer, submission.fileMimeType);
      const fraudSignals = await this.fraudDetectionService.collectSignals(submission.fileHash);

      // Regla dura: baja confianza del OCR o una señal de fraude nunca
      // se traducen en un rechazo automático — van a revisión humana.
      const requiresHuman = ocrResult.confidence === OcrConfidence.LOW || fraudSignals.length > 0;
      const nextStatus = requiresHuman ? S.MANUAL_REVIEW : S.PENDING_MOVEMENT;
      const reason = requiresHuman
        ? `OCR de baja confianza o señal de fraude: ${fraudSignals.map((s) => s.code).join(', ') || 'confianza LOW'}`
        : 'OCR completado con confianza suficiente';

      await this.transitionAutomatic(submission.id, S.PROCESSING, nextStatus, reason, {
        ocrExtractedData: this.serializeExtractedData(ocrResult.data),
        ocrConfidence: ocrResult.confidence,
      });

      if (requiresHuman) {
        await this.notify(submission, 'Tu comprobante quedó en revisión manual. Te avisaremos en cuanto se confirme.');
      }
    } catch (err) {
      const reason = err instanceof OcrProviderError ? `Error técnico de OCR: ${err.message}` : `Error inesperado: ${err}`;
      await this.transitionAutomatic(submission.id, S.PROCESSING, S.ERROR, reason, {});
      // ERROR ≠ REJECTED: no se le dice al cliente que su comprobante es falso por un fallo técnico.
      await this.notify(submission, 'No pudimos procesar tu comprobante por un problema técnico. Lo intentaremos de nuevo.');
    }
  }

  private async runReconciliationStep(submission: PaymentSubmission): Promise<void> {
    if (!submission.bankAccountId) {
      await this.transitionAutomatic(
        submission.id,
        submission.status,
        S.ERROR,
        'No hay una cuenta bancaria asociada al comprobante; no se puede buscar el movimiento.',
        {},
      );
      return;
    }

    if (submission.status === S.PENDING_MOVEMENT) {
      const moved = await this.repository.transitionStatus(submission.id, S.PENDING_MOVEMENT, {
        toStatus: S.MATCHING,
        reason: 'Buscando movimiento candidato',
        actor: 'SYSTEM',
      });
      if (!moved) return;
    }

    const extracted = (submission.ocrExtractedData ?? {}) as Record<string, unknown>;
    const occurredAt = extracted.occurredAt ? new Date(extracted.occurredAt as string) : submission.createdAt;

    const candidates = await this.movementRepository.findMany({
      accountId: submission.bankAccountId,
      excludeAlreadyMatched: true,
      dateFrom: new Date(occurredAt.getTime() - RECONCILIATION_WINDOW_MS),
      dateTo: new Date(occurredAt.getTime() + RECONCILIATION_WINDOW_MS),
    });

    const outcome = this.reconciliationEngine.match(
      {
        ...extracted,
        occurredAt: extracted.occurredAt ? new Date(extracted.occurredAt as string) : undefined,
      },
      candidates,
    );

    switch (outcome.result) {
      case MatchResult.PENDING:
        // Todavía no hay movimientos en la ventana: Assu puede no
        // haber sincronizado aún. Se vuelve a PENDING_MOVEMENT para que
        // un reintento programado lo reprocese más tarde — NUNCA se
        // interpreta como "no existe" (sección 10).
        await this.transitionAutomatic(
          submission.id,
          S.MATCHING,
          S.PENDING_MOVEMENT,
          'Aún no se detecta un movimiento candidato; se reintentará',
          { matchResult: MatchResult.PENDING, matchScore: 0 },
        );
        return;

      case MatchResult.EXACT_MATCH: {
        const verified = await this.repository.transitionStatus(submission.id, S.MATCHING, {
          toStatus: S.VERIFIED,
          reason: `Coincidencia exacta con el movimiento ${outcome.movementId}`,
          actor: 'SYSTEM',
          matchedMovementId: outcome.movementId,
          matchResult: outcome.result,
          matchScore: outcome.score,
        });
        if (!verified) {
          // Alguien más ganó la carrera por el mismo movimiento (unique
          // constraint) o el estado ya cambió; se re-encola como ambiguo
          // para que un humano lo revise en vez de fallar en silencio.
          await this.transitionAutomatic(
            submission.id,
            submission.status,
            S.AMBIGUOUS,
            'El movimiento candidato ya fue asignado a otro comprobante mientras se conciliaba',
            {},
          );
          return;
        }
        await this.publishResolved(submission.id, S.VERIFIED, outcome.movementId, outcome.result, submission.bankAccountId);
        await this.notify(submission, '¡Tu pago fue verificado correctamente! ✅');
        return;
      }

      case MatchResult.PROBABLE_MATCH:
        // Conservador a propósito: una coincidencia probable (no exacta
        // en referencia) pasa por un humano antes de marcarse VERIFIED.
        await this.transitionAutomatic(submission.id, S.MATCHING, S.MANUAL_REVIEW, 'Coincidencia probable, requiere confirmación humana', {
          matchResult: outcome.result,
          matchScore: outcome.score,
          matchedMovementId: outcome.candidates[0]?.movement.id ?? null,
        });
        await this.notify(submission, 'Estamos terminando de confirmar tu pago, te avisaremos pronto.');
        return;

      case MatchResult.AMBIGUOUS_MATCH:
        await this.transitionAutomatic(submission.id, S.MATCHING, S.AMBIGUOUS, 'Existen varios movimientos candidatos sin una coincidencia clara', {
          matchResult: outcome.result,
          matchScore: outcome.score,
        });
        await this.notify(submission, 'Estamos terminando de confirmar tu pago, te avisaremos pronto.');
        return;

      case MatchResult.NO_MATCH:
      default: {
        const rejected = await this.repository.transitionStatus(submission.id, S.MATCHING, {
          toStatus: S.REJECTED,
          reason: 'Ningún movimiento en la ventana de tiempo coincide con el monto/referencia del comprobante',
          actor: 'SYSTEM',
          matchResult: outcome.result,
          matchScore: outcome.score,
          rejectionReason: 'No se encontró un movimiento que corresponda a este comprobante.',
        });
        if (rejected) {
          await this.publishResolved(submission.id, S.REJECTED, null, outcome.result, submission.bankAccountId);
          await this.notify(submission, 'No pudimos validar tu comprobante con los movimientos recibidos. Si crees que es un error, contáctanos.');
        }
        return;
      }
    }
  }

  /**
   * Punto único de entrada humano para transiciones sensibles
   * (AMBIGUOUS/MANUAL_REVIEW/ERROR/REJECTED → VERIFIED/REJECTED/etc.).
   * `actor` DEBE identificar a la persona (ej. "USER:emily@assu.app"),
   * nunca "SYSTEM" — eso es lo que hace auditable la decisión.
   */
  async manualReview(submissionId: string, toStatus: S, reason: string, actor: string): Promise<PaymentSubmission> {
    const submission = await this.findById(submissionId);
    const allowed = MANUAL_TRANSITIONS[submission.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new InvalidTransitionError(submission.status, toStatus);
    }

    const ok = await this.repository.transitionStatus(submissionId, submission.status, {
      toStatus,
      reason,
      actor,
    });
    if (!ok) {
      throw new Error('El estado del comprobante cambió mientras se procesaba la revisión manual; recarga e intenta de nuevo.');
    }

    if (toStatus === S.VERIFIED || toStatus === S.REJECTED) {
      await this.publishResolved(submissionId, toStatus, submission.matchedMovementId, submission.matchResult, submission.bankAccountId);
    }

    return this.findById(submissionId);
  }

  private async transitionAutomatic(
    submissionId: string,
    from: S,
    to: S,
    reason: string,
    extra: {
      ocrExtractedData?: unknown;
      ocrConfidence?: string | null;
      matchedMovementId?: string | null;
      matchResult?: string | null;
      matchScore?: number | null;
      rejectionReason?: string | null;
    },
  ): Promise<boolean> {
    if (!(SYSTEM_TRANSITIONS[from] ?? []).includes(to)) {
      // Esto sería un bug de programación (una ruta de código pidiendo
      // una transición que la tabla no permite), no una condición de
      // negocio esperada — por eso se registra como ERROR en vez de
      // dejarlo pasar en silencio.
      this.logger.error(`${INVALID_TRANSITION_MESSAGE}: ${from} → ${to} (automático) para ${submissionId}`);
      return false;
    }
    return this.repository.transitionStatus(submissionId, from, { toStatus: to, reason, actor: 'SYSTEM', ...extra });
  }

  private async publishResolved(
    submissionId: string,
    status: S,
    movementId: string | null,
    matchResult: MatchResult | string | null,
    bankAccountId: string | null,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish({
        name: PAYMENT_VERIFICATION_RESOLVED_EVENT,
        version: PAYMENT_VERIFICATION_RESOLVED_EVENT_VERSION,
        occurredAt: new Date(),
        payload: { submissionId, status, movementId, matchResult, bankAccountId },
      });
    } catch (err) {
      // Mismo principio que Sync Engine con movement.created: la
      // verificación ya quedó persistida; un fallo al publicar el
      // evento no debe revertirla.
      this.logger.error(`No se pudo publicar ${PAYMENT_VERIFICATION_RESOLVED_EVENT} para ${submissionId}: ${err}`);
    }
  }

  private async notify(submission: PaymentSubmission, message: string): Promise<void> {
    if (submission.channel !== 'TELEGRAM') return; // el canal API no recibe notificaciones push, el cliente consulta el estado
    try {
      await this.responder.respond(submission.senderIdentifier, message);
    } catch (err) {
      this.logger.warn(`No se pudo notificar al remitente de ${submission.id}: ${err}`);
    }
  }

  /** Json de Prisma no acepta `Date` directamente; se guarda como ISO 8601. */
  private serializeExtractedData(data: ExtractedReceiptData): Record<string, unknown> {
    return {
      ...data,
      occurredAt: data.occurredAt instanceof Date ? data.occurredAt.toISOString() : data.occurredAt,
    };
  }
}
