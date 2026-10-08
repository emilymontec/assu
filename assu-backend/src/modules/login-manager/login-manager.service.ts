import { Injectable, Logger } from '@nestjs/common';
import { BankAccountService } from '../bank-account/bank-account.service';
import { BankService } from '../bank/bank.service';
import { AdapterFactoryService } from '../bank-adapter/adapter-factory.service';
import { SessionManagerService } from '../session-manager/session-manager.service';
import { BankAdapter, ExportedSession } from '../../core/ports/bank-adapter.interface';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { InvalidCredentialsError } from '../../common/errors/permanent.error';
import { AuditService } from '../audit/audit.service';
import { AuditResult } from '../../core/domain/audit/audit-result.enum';

@Injectable()
export class LoginManagerService {
  private readonly logger = new Logger(LoginManagerService.name);

  constructor(
    private readonly bankAccountService: BankAccountService,
    private readonly bankService: BankService,
    private readonly adapterFactory: AdapterFactoryService,
    private readonly sessionManager: SessionManagerService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Punto de entrada único de este módulo. Garantiza que el adapter
   * devuelto tenga una sesión utilizable: reutiliza una guardada si existe
   * y el adapter la soporta (evita logins innecesarios), o hace login real
   * si hace falta. Cubre de punta a punta "iniciar sesión", "validar
   * credenciales", "detectar sesión expirada" e "intentar renovar/reiniciar
   * sesión" del roadmap.
   */
  async ensureLoggedIn(accountId: string): Promise<BankAdapter> {
    const { account } = await this.bankAccountService.findById(accountId); // 404 si no existe
    const bank = await this.bankService.findById(account.bankId);

    if (!bank.isAvailable()) {
      throw new Error(`El banco "${bank.name}" no está activo; no se puede iniciar sesión`);
    }
    if (account.status === AccountStatus.SUSPENDED) {
      throw new Error(`La cuenta ${accountId} está suspendida; no se puede iniciar sesión`);
    }
    if (account.needsReconnection()) {
      throw new InvalidCredentialsError(
        `La cuenta ${accountId} requiere reautenticación. Rota las credenciales primero ` +
          '(PATCH /bank-accounts/:id/credentials) antes de reintentar.',
      );
    }

    const adapter = this.adapterFactory.create(bank.adapterKey);

    const existingSession = await this.sessionManager.getValidSession(accountId);
    if (existingSession && adapter.restoreSession) {
      this.logger.log(`Reutilizando sesión guardada para la cuenta ${accountId} (evita login innecesario)`);
      await adapter.restoreSession(existingSession);
      return adapter;
    }

    await this.performLogin(accountId, adapter);
    return adapter;
  }

  /** Capacidad explícita de "detectar sesión expirada", además del chequeo interno de ensureLoggedIn(). */
  async isSessionExpired(accountId: string): Promise<boolean> {
    return !(await this.sessionManager.hasValidSession(accountId));
  }

  /** Cubre "cerrar sesión": libera los recursos del adapter e invalida la sesión guardada. */
  async logout(accountId: string, adapter: BankAdapter): Promise<void> {
    try {
      await adapter.logout();
      await this.sessionManager.invalidate(accountId);
      await this.auditService.logLogout(accountId, AuditResult.SUCCESS);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.auditService.logLogout(accountId, AuditResult.FAILURE, message);
      throw err;
    }
  }

  private async performLogin(accountId: string, adapter: BankAdapter): Promise<void> {
    const credentials = await this.bankAccountService.getDecryptedCredentials(accountId);

    try {
      await adapter.login(credentials);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.auditService.logLogin(accountId, AuditResult.FAILURE, message);

      if (err instanceof InvalidCredentialsError) {
        this.logger.warn(`Credenciales inválidas para la cuenta ${accountId}; marcando REAUTH_REQUIRED`);
        await this.bankAccountService.markReauthRequired(accountId);
      }
      // Errores transitorios (timeout, banco caído) se propagan tal cual:
      // decidir si reintentar es responsabilidad de Retry & Error Handling (módulo 13).
      throw err;
    }

    const exported: ExportedSession = adapter.exportSession
      ? await adapter.exportSession()
      : { cookies: [], tokens: {} };

    await this.sessionManager.createSession(accountId, exported.cookies, exported.tokens);
    await this.auditService.logLogin(accountId, AuditResult.SUCCESS);
  }
}
