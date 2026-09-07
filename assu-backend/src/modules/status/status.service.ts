import { Injectable } from '@nestjs/common';
import { BankService } from '../bank/bank.service';
import { BankAccountService } from '../bank-account/bank-account.service';
import { SyncLogService } from '../sync-log/sync-log.service';
import { BankStatus } from '../../core/domain/bank/bank-status.enum';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { SystemStatusResponseDto } from './dto/system-status-response.dto';
import { LastSyncResponseDto } from './dto/last-sync-response.dto';

/**
 * Cubre "Estado" (`GET /status`) y "Última sincronización" (`GET
 * /last-sync`) del roadmap de Internal API (módulo 19). No introduce
 * persistencia propia: solo agrega datos que YA existen en Bank
 * Management, Bank Account Management y Sync Log — es una capa de
 * lectura para dashboards/monitoreo, nada más.
 */
@Injectable()
export class StatusService {
  constructor(
    private readonly bankService: BankService,
    private readonly bankAccountService: BankAccountService,
    private readonly syncLogService: SyncLogService,
  ) {}

  /** Cubre "consultar estado general". */
  async getSystemStatus(): Promise<SystemStatusResponseDto> {
    const [banks, accounts] = await Promise.all([
      this.bankService.findAll({}),
      this.bankAccountService.findAll({}),
    ]);

    const banksByStatus = { total: banks.length, ACTIVE: 0, INACTIVE: 0, DEGRADED: 0 };
    for (const bank of banks) {
      banksByStatus[bank.status as keyof typeof BankStatus]++;
    }

    const accountsByStatus = {
      total: accounts.length,
      PENDING: 0,
      ACTIVE: 0,
      REAUTH_REQUIRED: 0,
      SUSPENDED: 0,
      ERROR: 0,
    };
    for (const { account } of accounts) {
      accountsByStatus[account.status as keyof typeof AccountStatus]++;
    }

    // "Degradado" a nivel de sistema si hay algún banco DEGRADED o cualquier
    // cuenta en ERROR/REAUTH_REQUIRED — señal simple para un dashboard,
    // sin pretender ser un health-check de infraestructura (eso es /health).
    const isDegraded =
      banksByStatus.DEGRADED > 0 || accountsByStatus.ERROR > 0 || accountsByStatus.REAUTH_REQUIRED > 0;

    return {
      status: isDegraded ? 'degraded' : 'ok',
      banks: banksByStatus,
      accounts: accountsByStatus,
      accountsNeedingReconnection: accountsByStatus.REAUTH_REQUIRED,
      timestamp: new Date().toISOString(),
    };
  }

  /** Cubre "consultar última sincronización por cuenta" para UNA cuenta puntual. */
  async getLastSyncForAccount(accountId: string): Promise<LastSyncResponseDto> {
    const { account, bankName } = await this.bankAccountService.findById(accountId); // 404 si no existe
    const [lastLog] = await this.syncLogService.findMany({ accountId, limit: 1 });

    return {
      accountId: account.id,
      bankName,
      status: account.status,
      syncEnabled: account.syncEnabled,
      lastSyncAt: account.lastSyncAt,
      lastMovementReference: account.lastMovementReference,
      lastSyncStatus: lastLog?.status ?? null,
      lastSyncError: lastLog?.error ?? null,
      lastSyncDurationMs: lastLog?.durationMs ?? null,
    };
  }

  /**
   * Cubre "consultar última sincronización" para TODAS las cuentas (vista
   * de resumen). Hace un query de Sync Log por cuenta (N+1 deliberado: el
   * número de cuentas es chico para un dashboard interno; si esto se
   * usa con miles de cuentas, se reemplaza por una query agregada).
   */
  async getLastSyncOverview(): Promise<LastSyncResponseDto[]> {
    const accounts = await this.bankAccountService.findAll({});

    const results = await Promise.all(
      accounts.map(async ({ account, bankName }) => {
        const [lastLog] = await this.syncLogService.findMany({ accountId: account.id, limit: 1 });
        return {
          accountId: account.id,
          bankName,
          status: account.status,
          syncEnabled: account.syncEnabled,
          lastSyncAt: account.lastSyncAt,
          lastMovementReference: account.lastMovementReference,
          lastSyncStatus: lastLog?.status ?? null,
          lastSyncError: lastLog?.error ?? null,
          lastSyncDurationMs: lastLog?.durationMs ?? null,
        };
      }),
    );

    // Cuentas sin sincronizar (o más desactualizadas) primero: es lo más
    // útil para un operador que abre este endpoint buscando problemas.
    return results.sort((a, b) => (a.lastSyncAt?.getTime() ?? 0) - (b.lastSyncAt?.getTime() ?? 0));
  }
}
