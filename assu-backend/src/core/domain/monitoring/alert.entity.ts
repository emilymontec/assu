import { AlertType } from './alert-type.enum';
import { AlertSeverity } from './alert-severity.enum';

/** Igual que AuditLog: inmutable una vez creada, es evidencia histórica de un problema operativo. */
export class Alert {
  constructor(
    public readonly id: string,
    public readonly type: AlertType,
    public readonly severity: AlertSeverity,
    public readonly message: string,
    public readonly entityType: string,
    public readonly entityId: string | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}
}
