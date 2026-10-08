import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BankAccountService } from '../bank-account/bank-account.service';
import { BankService } from '../bank/bank.service';
import { LoginManagerService } from '../login-manager/login-manager.service';
import { MovementParserService } from '../movement-parser/movement-parser.service';
import { MovementValidatorService } from '../movement-validator/movement-validator.service';
import { MovementDeduplicationService } from '../movement-deduplication/movement-deduplication.service';
import { MovementService } from '../movement/movement.service';
import { SyncLogService } from '../sync-log/sync-log.service';
import { RetryErrorHandlingService } from '../retry-error-handling/retry-error-handling.service';
import { RateLimitingService } from '../rate-limiting/rate-limiting.service';
import { AuditService } from '../audit/audit.service';
import { AuditResult } from '../../core/domain/audit/audit-result.enum';
import { MetricsService } from '../observability/metrics.service';
import { EVENT_PUBLISHER_PORT, EventPublisherPort } from '../../core/ports/event-publisher.port';
import { BankAdapter } from '../../core/ports/bank-adapter.interface';
import { Bank } from '../../core/domain/bank/bank.entity';
import { Movement } from '../../core/domain/movement/movement.entity';
import { MovementStatus } from '../../core/domain/movement/movement-status.enum';
import { SyncStatus } from '../../core/domain/sync/sync-log.entity';
import {
  MOVEMENT_CREATED_EVENT,
  MOVEMENT_CREATED_EVENT_VERSION,
  MovementCreatedPayload,
} from '../events/movement-created.event';

export interface SyncResult {
  movementsFound: number;
  movementsNew: number;
}

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);

  constructor(
    private readonly bankAccountService: BankAccountService,
    private readonly bankService: BankService,
    private readonly loginManagerService: LoginManagerService,
    private readonly movementParserService: MovementParserService,
    private readonly movementValidatorService: MovementValidatorService,
    private readonly movementDeduplicationService: MovementDeduplicationService,
    private readonly movementService: MovementService,
    private readonly syncLogService: SyncLogService,
    private readonly retryErrorHandlingService: RetryErrorHandlingService,
    private readonly rateLimitingService: RateLimitingService,
    private readonly auditService: AuditService,
    private readonly metricsService: MetricsService,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: EventPublisherPort,
  ) {}

  /**
   * El flujo del roadmap de punta a punta:
   * Login → Consultar → Normalizar → Comparar → Validar → Guardar → Publicar evento.
   *
   * Este servicio SOLO orquesta — cada paso delega en el módulo que le
   * corresponde. Si algo fuera de lo esperado ocurre en cualquier punto,
   * el intento completo se marca FAILED en Sync Log y el error se propaga
   * (Retry & Error Handling, módulo 13, decidirá qué hacer con reintentos).
   */
  async syncAccount(accountId: string): Promise<SyncResult> {
    const syncLog = await this.syncLogService.start(accountId);
    let adapter: BankAdapter | undefined;
    let bank: Bank | undefined;

    try {
      const { account } = await this.bankAccountService.findById(accountId);
      bank = await this.bankService.findById(account.bankId);

      // Rate Limiting (módulo 17): se revisa ANTES de intentar login, para
      // no gastar un login real contra una solicitud que de todos modos
      // se va a rechazar.
      await this.rateLimitingService.checkAccountLimit(accountId);
      await this.rateLimitingService.checkBankLimit(bank.adapterKey);

      adapter = await this.loginManagerService.ensureLoggedIn(accountId);
      const rawMovements = await adapter.sync(account.lastMovementReference);

      let movementsNew = 0;
      let newestReference: string | null = null;

      for (const raw of rawMovements) {
        const parsed = this.movementParserService.parse(bank.adapterKey, raw);

        // Los movimientos vienen del más reciente al más antiguo: el
        // primero que se procese exitosamente es el nuevo puntero.
        if (newestReference === null && parsed.reference) {
          newestReference = parsed.reference;
        }

        const validation = this.movementValidatorService.validate(parsed);
        if (!validation.valid) {
          this.logger.warn(`Movimiento descartado (cuenta ${accountId}): ${validation.reason}`);
          continue;
        }

        const isDuplicate = await this.movementDeduplicationService.isDuplicate(
          accountId,
          parsed.reference,
          parsed.amount,
          parsed.date,
        );
        if (isDuplicate) {
          continue;
        }

        const movement = new Movement(
          randomUUID(),
          accountId,
          parsed.reference,
          parsed.amount,
          parsed.currency,
          parsed.sender,
          parsed.receiver,
          parsed.movementType,
          parsed.date,
          MovementStatus.VALID,
          false,
          raw,
          new Date(),
        );

        const saved = await this.movementService.create(movement);
        movementsNew++;

        await this.publishMovementCreated(saved, bank.name);
      }

      // Sync exitoso aunque no haya movimientos nuevos que apuntar
      // (recordSuccessfulSync acepta null para ese caso).
      await this.bankAccountService.recordSuccessfulSync(accountId, newestReference);
      await this.loginManagerService.logout(accountId, adapter);

      const finishedLog = await this.syncLogService.finish(syncLog.id, {
        status: SyncStatus.SUCCESS,
        movementsFound: rawMovements.length,
        movementsNew,
      });
      await this.auditService.logSync(accountId, AuditResult.SUCCESS, {
        movementsFound: rawMovements.length,
        movementsNew,
      });
      this.metricsService.recordSync(bank.adapterKey, 'SUCCESS', finishedLog.durationMs ?? 0);
      this.metricsService.recordMovementsSaved(bank.adapterKey, movementsNew);

      return { movementsFound: rawMovements.length, movementsNew };
    } catch (err) {
      if (adapter) {
        await this.loginManagerService.logout(accountId, adapter).catch(() => undefined);
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      const finishedLog = await this.syncLogService.finish(syncLog.id, {
        status: SyncStatus.FAILED,
        error: errorMessage,
        movementsFound: 0,
        movementsNew: 0,
      });
      await this.auditService.logSync(accountId, AuditResult.FAILURE, undefined, errorMessage);
      const bankKey = bank?.adapterKey ?? 'unknown';
      const errorType = err instanceof Error ? err.constructor.name : 'UnknownError';
      this.metricsService.recordSync(bankKey, 'FAILED', finishedLog.durationMs ?? 0);
      this.metricsService.recordSyncError(bankKey, errorType);
      // Revisa si hay que escalar la cuenta a ERROR por fallos consecutivos
      // (Retry & Error Handling, módulo 13). Nunca deja que un problema
      // AQUÍ oculte el error original del sync.
      await this.retryErrorHandlingService.handleSyncFailure(accountId).catch((escalationErr) => {
        this.logger.error(`No se pudo evaluar la escalación de errores para ${accountId}: ${escalationErr}`);
      });
      throw err;
    }
  }

  private async publishMovementCreated(movement: Movement, bankName: string): Promise<void> {
    const payload: MovementCreatedPayload = {
      movementId: movement.id,
      accountId: movement.accountId,
      bank: bankName,
      amount: movement.amount,
      currency: movement.currency,
      reference: movement.reference,
      date: movement.date.toISOString(),
    };

    try {
      await this.eventPublisher.publish({
        name: MOVEMENT_CREATED_EVENT,
        version: MOVEMENT_CREATED_EVENT_VERSION,
        occurredAt: new Date(),
        payload,
      });
    } catch (err) {
      // El movimiento YA quedó guardado — no se revierte la persistencia
      // por un fallo de publicación. Un outbox pattern para reintentar
      // eventos pendientes por separado queda fuera de este alcance.
      this.logger.error(`No se pudo publicar movement.created para ${movement.id}: ${err}`);
    }
  }
}
