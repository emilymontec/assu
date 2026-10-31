import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankAccountRepository, BankAccountWithBankName } from './repositories/bank-account.repository';
import { BankService } from '../bank/bank.service';
import { ENCRYPTION_PORT, EncryptionPort } from '../../core/ports/encryption.port';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
import { ListBankAccountsQueryDto } from './dto/list-bank-accounts-query.dto';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { AuditService } from '../audit/audit.service';
import { MERCHANT_NOTIFIER_PORT, MerchantNotifierPort } from '../../core/ports/merchant-notifier.port';
import { NotificationType } from '../../core/domain/notification/notification-type.enum';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(
    private readonly repository: BankAccountRepository,
    private readonly bankService: BankService,
    private readonly configService: ConfigService,
    @Inject(ENCRYPTION_PORT) private readonly encryption: EncryptionPort,
    private readonly auditService: AuditService,
    @Inject(MERCHANT_NOTIFIER_PORT) private readonly merchantNotifier: MerchantNotifierPort,
  ) {}

  async create(dto: CreateBankAccountDto): Promise<BankAccountWithBankName> {
    const bank = await this.bankService.findById(dto.bankId); // lanza 404 si el banco no existe

    if (!bank.isAvailable()) {
      throw new ConflictException(
        `El banco "${bank.name}" está en estado ${bank.status}; no se pueden crear cuentas nuevas hasta que esté activo`,
      );
    }

    const defaultInterval = this.configService.get<number>('scheduler.defaultSyncIntervalSeconds') ?? 60;
    const encryptedCredentials = await this.encryption.encrypt(JSON.stringify(dto.credentials));
    const account = await this.repository.create({
      bankId: dto.bankId,
      merchantId: dto.merchantId,
      accountNumber: dto.accountNumber,
      encryptedCredentials,
      credentialsReadOnlyConfirmed: dto.confirmedReadOnlyCredentials,
      syncIntervalSeconds: dto.syncIntervalSeconds ?? defaultInterval,
    });

    // Best-effort: si el merchantId no corresponde a un comercio
    // registrado en el Portal (ej. cuentas cargadas antes de que
    // existiera, o de un flujo administrativo que no pasa por ahí), el
    // notifier simplemente no encuentra a quién avisar — no debe tumbar
    // la creación de la cuenta, que ya se guardó correctamente.
    await this.safeNotifyMerchant(
      dto.merchantId,
      NotificationType.BANK_ACCOUNT_ADDED,
      { accountId: account.id, bankName: bank.name, accountNumber: account.accountNumber },
      `Agregaste una cuenta nueva del banco ${bank.name} (••••${account.accountNumber.slice(-4)}).`,
    );

    return { account, bankName: bank.name };
  }

  async findAll(query: ListBankAccountsQueryDto): Promise<BankAccountWithBankName[]> {
    return this.repository.findAllWithBank(query);
  }

  /** Cubre la función "detectar cuentas que requieren reconexión" del módulo. */
  async findNeedingReconnection(): Promise<BankAccountWithBankName[]> {
    return this.repository.findAllWithBank({ status: AccountStatus.REAUTH_REQUIRED });
  }

  async findById(id: string): Promise<BankAccountWithBankName> {
    const record = await this.repository.findByIdWithBank(id);
    if (!record) {
      throw new NotFoundException(`Cuenta ${id} no encontrada`);
    }
    return record;
  }

  async update(id: string, dto: UpdateBankAccountDto): Promise<BankAccountWithBankName> {
    await this.findById(id);
    if (dto.accountNumber) {
      await this.repository.updateAccountNumber(id, dto.accountNumber);
    }
    if (dto.syncIntervalSeconds) {
      await this.repository.updateSyncInterval(id, dto.syncIntervalSeconds);
    }
    return this.findById(id);
  }

  async updateCredentials(id: string, dto: UpdateCredentialsDto): Promise<BankAccountWithBankName> {
    await this.findById(id);
    const encryptedCredentials = await this.encryption.encrypt(JSON.stringify(dto.credentials));
    await this.repository.updateCredentials(id, encryptedCredentials, dto.confirmedReadOnlyCredentials);
    // Nunca se audita el contenido de las credenciales, solo el hecho de que rotaron.
    await this.auditService.logConfigChange('BankAccount', id, 'api', { credentialsRotated: true });
    return this.findById(id);
  }

  async enableSync(id: string): Promise<BankAccountWithBankName> {
    await this.findById(id);
    await this.repository.updateSyncEnabled(id, true);
    await this.auditService.logConfigChange('BankAccount', id, 'api', { syncEnabled: true });
    return this.findById(id);
  }

  async disableSync(id: string): Promise<BankAccountWithBankName> {
    await this.findById(id);
    await this.repository.updateSyncEnabled(id, false);
    await this.auditService.logConfigChange('BankAccount', id, 'api', { syncEnabled: false });
    return this.findById(id);
  }

  async suspend(id: string): Promise<BankAccountWithBankName> {
    const { account, bankName } = await this.findById(id);
    await this.repository.updateStatus(id, AccountStatus.SUSPENDED);
    await this.auditService.logAdminOperation('SUSPEND', 'BankAccount', id, 'api');

    await this.safeNotifyMerchant(
      account.merchantId,
      NotificationType.BANK_ACCOUNT_REMOVED,
      { accountId: id, bankName },
      `Se eliminó/suspendió tu cuenta del banco ${bankName} (••••${account.accountNumber.slice(-4)}). Si no fuiste tú, contacta a soporte.`,
    );

    return this.findById(id);
  }

  async reactivate(id: string): Promise<BankAccountWithBankName> {
    const { account } = await this.findById(id);

    if (account.status === AccountStatus.REAUTH_REQUIRED) {
      throw new ConflictException(
        'Esta cuenta requiere credenciales nuevas antes de reactivarse. ' +
          'Usa PATCH /bank-accounts/:id/credentials primero.',
      );
    }

    await this.repository.updateStatus(id, AccountStatus.ACTIVE);
    await this.auditService.logAdminOperation('REACTIVATE', 'BankAccount', id, 'api');
    return this.findById(id);
  }

  /**
   * A diferencia de `suspend()`/`reactivate()` (acciones administrativas),
   * esto lo dispara Login Manager automáticamente cuando un login REAL
   * contra el banco falla por credenciales inválidas. No lanza si la
   * cuenta no existe silenciosamente — si algo llama esto con un id
   * inválido, es un bug en quien llama, no una condición esperada.
   */
  async markReauthRequired(id: string): Promise<void> {
    await this.repository.updateStatus(id, AccountStatus.REAUTH_REQUIRED);
  }

  /** Lo usa Retry & Error Handling (módulo 13) tras demasiados fallos consecutivos. */
  async markError(id: string): Promise<void> {
    await this.repository.updateStatus(id, AccountStatus.ERROR);
  }

  /** Lo usa Sync Engine (módulo 7) tras un sync exitoso, tenga o no movimientos nuevos que apuntar. */
  async recordSuccessfulSync(id: string, lastMovementReference: string | null): Promise<void> {
    await this.repository.recordSuccessfulSync(id, lastMovementReference);
  }

  /**
   * Cubre "solicitar sincronización manual" a nivel de VALIDACIÓN
   * únicamente. La ejecución real vive en `POST /sync` (Sync Engine,
   * módulo 7) — BankAccountModule no puede importar SyncEngineModule sin
   * crear una dependencia circular, así que este método se queda como
   * una validación previa útil (por ejemplo, para que un frontend
   * confirme que una cuenta ES sincronizable antes de disparar el sync
   * real en otro endpoint).
   */
  async requestManualSync(id: string): Promise<void> {
    const { account } = await this.findById(id);

    if (!account.syncEnabled) {
      throw new BadRequestException('La sincronización está deshabilitada para esta cuenta');
    }

    if (account.status !== AccountStatus.ACTIVE && account.status !== AccountStatus.PENDING) {
      throw new BadRequestException(
        `La cuenta está en estado ${account.status}; no puede sincronizarse manualmente`,
      );
    }

    throw new NotImplementedException(
      'Esta cuenta pasó todas las validaciones. Para ejecutar el sync real, usa POST /sync ' +
        'con { "accountId": "' +
        id +
        '" } (Sync Engine, módulo 7) — este endpoint solo valida, no ejecuta.',
    );
  }

  /** Punto único de descifrado real — lo usarán Login Manager/Sync Engine cuando existan. Nunca se expone por HTTP. */
  async getDecryptedCredentials(id: string): Promise<Record<string, string>> {
    const account = await this.repository.findById(id);
    if (!account) {
      throw new NotFoundException(`Cuenta ${id} no encontrada`);
    }
    const decrypted = await this.encryption.decrypt(account.encryptedCredentials);
    return JSON.parse(decrypted) as Record<string, string>;
  }

  /**
   * Notificar al comercio es una operación secundaria: si falla (ej. el
   * merchantId no corresponde a ningún comercio registrado en el
   * Portal, o el correo no se pudo enviar), NUNCA debe tumbar la
   * operación principal que ya se completó con éxito — mismo principio
   * que audit logging/métricas en el resto del sistema.
   */
  private async safeNotifyMerchant(
    merchantId: string,
    type: NotificationType,
    metadata: Record<string, unknown>,
    message: string,
  ): Promise<void> {
    try {
      await this.merchantNotifier.notify({ merchantId, type, message, metadata });
    } catch (err) {
      this.logger.warn(`No se pudo notificar al comercio ${merchantId} (${type}): ${err}`);
    }
  }
}
