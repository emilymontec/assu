import { AuditAction } from './audit-action.enum';
import { AuditResult } from './audit-result.enum';

/**
 * Registro inmutable de una operación sensible. No expone métodos de
 * mutación a propósito: una vez creado, un AuditLog nunca se edita ni se
 * borra (append-only) — es la única forma de que sirva de verdad para
 * investigar incidentes.
 */
export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly action: AuditAction,
    /** Quién/qué disparó la acción: 'login-manager', 'sync-engine', 'api', etc. Sin sistema de usuarios propio hoy, no es un userId. */
    public readonly actor: string,
    /** Tipo de entidad afectada: 'BankAccount', 'Bank', etc. */
    public readonly entityType: string,
    public readonly entityId: string | null,
    public readonly result: AuditResult,
    public readonly metadata: Record<string, unknown> | null,
    public readonly errorMessage: string | null,
    public readonly createdAt: Date,
  ) {}
}
