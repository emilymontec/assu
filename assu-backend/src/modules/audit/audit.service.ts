import { Injectable, Logger } from '@nestjs/common';
import {
  AuditLogRepository,
  CreateAuditLogData,
  FindAuditLogsFilters,
} from './repositories/audit-log.repository';
import { AuditLog } from '../../core/domain/audit/audit-log.entity';
import { AuditAction } from '../../core/domain/audit/audit-action.enum';
import { AuditResult } from '../../core/domain/audit/audit-result.enum';

/**
 * Registra operaciones sensibles del sistema para trazabilidad e
 * investigación de incidentes (módulo 16 del roadmap).
 *
 * PRINCIPIO CLAVE: auditar NUNCA debe romper el flujo de negocio real.
 * Si Postgres está lento o caído, un login/logout/sync exitoso no puede
 * fallar solo porque no se pudo escribir el registro de auditoría — por
 * eso `record()` atrapa cualquier error internamente y solo lo deja en
 * el log de la aplicación. Es la misma filosofía que ya usa Sync Engine
 * al publicar `movement.created`: la operación principal ya ocurrió, no
 * se revierte por un problema de un sistema secundario.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repository: AuditLogRepository) {}

  async record(entry: CreateAuditLogData): Promise<void> {
    try {
      await this.repository.create(entry);
    } catch (err) {
      this.logger.error(
        `No se pudo registrar auditoría (${entry.action} / ${entry.entityType}:${entry.entityId ?? '-'}): ${err}`,
      );
    }
  }

  /** Cubre "registrar login". Lo usa Login Manager (módulo 4). */
  async logLogin(accountId: string, result: AuditResult, errorMessage?: string): Promise<void> {
    await this.record({
      action: AuditAction.LOGIN,
      actor: 'login-manager',
      entityType: 'BankAccount',
      entityId: accountId,
      result,
      errorMessage: errorMessage ?? null,
    });
  }

  /** Cubre "registrar logout". */
  async logLogout(accountId: string, result: AuditResult, errorMessage?: string): Promise<void> {
    await this.record({
      action: AuditAction.LOGOUT,
      actor: 'login-manager',
      entityType: 'BankAccount',
      entityId: accountId,
      result,
      errorMessage: errorMessage ?? null,
    });
  }

  /** Cubre "registrar sincronizaciones" (con éxito o fallo). Lo usa Sync Engine (módulo 7). */
  async logSync(
    accountId: string,
    result: AuditResult,
    metadata?: Record<string, unknown>,
    errorMessage?: string,
  ): Promise<void> {
    await this.record({
      action: AuditAction.SYNC,
      actor: 'sync-engine',
      entityType: 'BankAccount',
      entityId: accountId,
      result,
      metadata: metadata ?? null,
      errorMessage: errorMessage ?? null,
    });
  }

  /** Cubre "registrar cambios de configuración" (activar/desactivar banco, rotar credenciales, etc.). */
  async logConfigChange(
    entityType: string,
    entityId: string,
    actor: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    await this.record({
      action: AuditAction.CONFIG_CHANGE,
      actor,
      entityType,
      entityId,
      result: AuditResult.SUCCESS,
      metadata: changes,
    });
  }

  /** Cubre "registrar operaciones administrativas" (suspender/reactivar cuenta, escalar a ERROR, etc.). */
  async logAdminOperation(
    operation: string,
    entityType: string,
    entityId: string,
    actor: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.record({
      action: AuditAction.ADMIN_OPERATION,
      actor,
      entityType,
      entityId,
      result: AuditResult.SUCCESS,
      metadata: { operation, ...metadata },
    });
  }

  /** Cubre "registrar errores" que no encajan en las acciones anteriores (fallos de sistema genéricos). */
  async logError(
    entityType: string,
    entityId: string | null,
    actor: string,
    errorMessage: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.record({
      action: AuditAction.ERROR,
      actor,
      entityType,
      entityId,
      result: AuditResult.FAILURE,
      metadata: metadata ?? null,
      errorMessage,
    });
  }

  /** Cubre "consultar historial" para investigación de incidentes. */
  async findMany(filters: FindAuditLogsFilters = {}): Promise<AuditLog[]> {
    return this.repository.findMany(filters);
  }
}
