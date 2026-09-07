import { Injectable, Logger } from '@nestjs/common';
import { BankAccountService } from '../bank-account/bank-account.service';
import { SyncLogService } from '../sync-log/sync-log.service';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { PermanentError } from '../../common/errors/permanent.error';
import { TransientError } from '../../common/errors/transient.error';
import { AuditService } from '../audit/audit.service';
import { AlertService } from '../monitoring/alert.service';
import { AlertType } from '../../core/domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../../core/domain/monitoring/alert-severity.enum';

export interface ErrorClassification {
  retryable: boolean;
  reason: string;
}

/**
 * Después de cuántos fallos SEGUIDOS (sin ningún éxito entre medio) se
 * marca la cuenta como ERROR genérico. No aplica a credenciales
 * inválidas — eso ya lo marca Login Manager como REAUTH_REQUIRED en el
 * primer fallo, que es un estado más específico.
 */
const CONSECUTIVE_FAILURES_THRESHOLD = 5;

@Injectable()
export class RetryErrorHandlingService {
  private readonly logger = new Logger(RetryErrorHandlingService.name);

  constructor(
    private readonly bankAccountService: BankAccountService,
    private readonly syncLogService: SyncLogService,
    private readonly auditService: AuditService,
    private readonly alertService: AlertService,
  ) {}

  /**
   * Cubre "detectar errores temporales/permanentes" + "limitar cantidad
   * de reintentos": lo usa el Processor (módulo 14) para decidir si deja
   * que BullMQ reintente el job o lo da por perdido de una vez.
   */
  classify(error: unknown): ErrorClassification {
    if (error instanceof PermanentError) {
      return { retryable: false, reason: error.message };
    }
    if (error instanceof TransientError) {
      return { retryable: true, reason: error.message };
    }
    const message = error instanceof Error ? error.message : String(error);
    return {
      retryable: true,
      reason: `Error no clasificado ("${message}"); se trata como transitorio por precaución`,
    };
  }

  /**
   * Cubre "marcar cuentas con problemas". Se llama después de CUALQUIER
   * sync fallido (manual o automático) — revisa el historial reciente y,
   * si hay demasiados fallos seguidos, escala la cuenta a ERROR. No pisa
   * un estado ya más específico (REAUTH_REQUIRED, SUSPENDED).
   */
  async handleSyncFailure(accountId: string): Promise<void> {
    const { account, bankName } = await this.bankAccountService.findById(accountId);

    if (account.status === AccountStatus.REAUTH_REQUIRED || account.status === AccountStatus.SUSPENDED) {
      return;
    }

    const consecutiveFailures = await this.syncLogService.countConsecutiveFailures(accountId);
    if (consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
      this.logger.warn(`Cuenta ${accountId} marcada ERROR tras ${consecutiveFailures} fallos consecutivos`);
      await this.bankAccountService.markError(accountId);
      await this.auditService.logAdminOperation('ESCALATE_TO_ERROR', 'BankAccount', accountId, 'retry-error-handling', {
        consecutiveFailures,
      });
      // Cubre "alertar errores repetitivos" + "alertar problemas del
      // adapter": la escalación ocurre justo porque el adapter de este
      // banco viene fallando de forma consistente.
      await this.alertService.raise({
        type: AlertType.ACCOUNT_ESCALATED,
        severity: AlertSeverity.CRITICAL,
        message: `Cuenta de ${bankName} (${accountId}) escalada a ERROR tras ${consecutiveFailures} fallos consecutivos`,
        entityType: 'BankAccount',
        entityId: accountId,
        metadata: { consecutiveFailures, bankName },
      });
    }
  }
}
