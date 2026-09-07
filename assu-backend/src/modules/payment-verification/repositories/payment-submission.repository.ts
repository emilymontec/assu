import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateSubmissionData,
  ListSubmissionsFilters,
  PaymentSubmissionRepositoryPort,
} from '../../../core/ports/payment-submission-repository.port';
import { PaymentSubmission } from '../../../core/domain/payment-verification/payment-submission.entity';
import { PaymentSubmissionStatus } from '../../../core/domain/payment-verification/payment-submission-status.enum';
import { VerificationEvent } from '../../../core/domain/payment-verification/verification-event.entity';
import { MatchResult } from '../../../core/domain/payment-verification/match-result.enum';
import { OcrConfidence } from '../../../core/domain/payment-verification/ocr-confidence.enum';

type PrismaSubmissionRow = Prisma.PaymentSubmissionGetPayload<Record<string, never>>;
type PrismaEventRow = Prisma.VerificationEventGetPayload<Record<string, never>>;

@Injectable()
export class PaymentSubmissionRepository implements PaymentSubmissionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createIfNotExists(
    data: CreateSubmissionData,
  ): Promise<{ submission: PaymentSubmission; wasCreated: boolean }> {
    // Camino rápido de idempotencia real (webhook re-entregado): si ya
    // existe, se devuelve tal cual, sin tocar nada. Solo aplica cuando
    // el canal manda un externalMessageId (WHATSAPP); el canal API
    // puede no tenerlo, en cuyo caso cada llamada crea un submission
    // nuevo (la idempotencia ahí es responsabilidad del cliente de la API).
    if (data.externalMessageId) {
      const existing = await this.prisma.paymentSubmission.findUnique({
        where: {
          uniq_channel_external_message: {
            channel: data.channel,
            externalMessageId: data.externalMessageId,
          },
        },
      });
      if (existing) {
        return { submission: this.toDomain(existing), wasCreated: false };
      }
    }

    try {
      const created = await this.prisma.paymentSubmission.create({
        data: {
          ...(data.id && { id: data.id }),
          channel: data.channel,
          externalMessageId: data.externalMessageId,
          senderIdentifier: data.senderIdentifier,
          bankAccountId: data.bankAccountId,
          fileHash: data.fileHash,
          fileStorageRef: data.fileStorageRef,
          fileMimeType: data.fileMimeType,
          status: PaymentSubmissionStatus.RECEIVED,
          events: {
            create: {
              fromStatus: null,
              toStatus: PaymentSubmissionStatus.RECEIVED,
              reason: 'Comprobante recibido',
              actor: 'SYSTEM',
            },
          },
        },
      });
      return { submission: this.toDomain(created), wasCreated: true };
    } catch (err) {
      // Carrera: dos reentregas casi simultáneas del mismo mensaje
      // pueden pasar el check de arriba antes de que la primera
      // termine de insertar. El unique constraint de la BD es la
      // barrera final; si choca, se relee y se devuelve el existente
      // en vez de propagar el error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && data.externalMessageId) {
        const existing = await this.prisma.paymentSubmission.findUniqueOrThrow({
          where: {
            uniq_channel_external_message: {
              channel: data.channel,
              externalMessageId: data.externalMessageId,
            },
          },
        });
        return { submission: this.toDomain(existing), wasCreated: false };
      }
      throw err;
    }
  }

  async findById(id: string): Promise<PaymentSubmission | null> {
    const row = await this.prisma.paymentSubmission.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findMany(filters: ListSubmissionsFilters): Promise<PaymentSubmission[]> {
    const rows = await this.prisma.paymentSubmission.findMany({
      where: {
        status: filters.status,
        bankAccountId: filters.bankAccountId,
        createdAt:
          filters.dateFrom || filters.dateTo
            ? { gte: filters.dateFrom, lte: filters.dateTo }
            : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async existsByFileHash(fileHash: string): Promise<boolean> {
    const count = await this.prisma.paymentSubmission.count({ where: { fileHash } });
    return count > 0;
  }

  async transitionStatus(
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
  ): Promise<boolean> {
    try {
      // Transacción: el UPDATE con WHERE status = expectedStatus actúa
      // como compare-and-swap (protección contra dos workers procesando
      // el mismo submission a la vez), y el INSERT del evento de
      // auditoría queda atado a que el CAS haya funcionado.
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.paymentSubmission.updateMany({
          where: { id, status: expectedStatus },
          data: {
            status: update.toStatus,
            ocrExtractedData: update.ocrExtractedData as Prisma.InputJsonValue | undefined,
            ocrConfidence: update.ocrConfidence as OcrConfidence | null | undefined,
            matchedMovementId: update.matchedMovementId,
            matchResult: update.matchResult as MatchResult | null | undefined,
            matchScore: update.matchScore,
            rejectionReason: update.rejectionReason,
          },
        });

        if (result.count === 0) {
          // Nadie coincidió con expectedStatus: alguien más ya movió
          // este submission. Se aborta la transacción devolviendo un
          // marcador; no se inserta evento de un cambio que no ocurrió.
          throw new CasMismatchError();
        }

        await tx.verificationEvent.create({
          data: {
            submissionId: id,
            fromStatus: expectedStatus,
            toStatus: update.toStatus,
            reason: update.reason,
            actor: update.actor,
          },
        });
      });

      return true;
    } catch (err) {
      if (err instanceof CasMismatchError) return false;
      // La constraint única en matched_movement_id puede chocar si dos
      // submissions intentan conciliar el mismo movimiento a la vez:
      // el segundo pierde la carrera y debe tratarse como
      // "no se pudo verificar automáticamente", no como un 500 genérico.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return false;
      }
      throw err;
    }
  }

  async listEvents(submissionId: string): Promise<VerificationEvent[]> {
    const rows = await this.prisma.verificationEvent.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.eventToDomain(row));
  }

  private toDomain(row: PrismaSubmissionRow): PaymentSubmission {
    return new PaymentSubmission(
      row.id,
      row.channel as 'WHATSAPP' | 'API',
      row.externalMessageId,
      row.senderIdentifier,
      row.bankAccountId,
      row.fileHash,
      row.fileStorageRef,
      row.fileMimeType,
      row.status as PaymentSubmissionStatus,
      (row.ocrExtractedData as PaymentSubmission['ocrExtractedData']) ?? null,
      row.ocrConfidence as OcrConfidence | null,
      row.matchedMovementId,
      row.matchResult as MatchResult | null,
      row.matchScore,
      row.rejectionReason,
      row.createdAt,
      row.updatedAt,
    );
  }

  private eventToDomain(row: PrismaEventRow): VerificationEvent {
    return new VerificationEvent(
      row.id,
      row.submissionId,
      row.fromStatus as PaymentSubmissionStatus | null,
      row.toStatus as PaymentSubmissionStatus,
      row.reason,
      row.actor,
      row.createdAt,
    );
  }
}

class CasMismatchError extends Error {}
