/**
 * Estos tipos reflejan las entidades de dominio del backend
 * (assu-backend/src/core/domain/*). Cuando el backend implemente los DTOs
 * reales de la Internal API, este archivo es el punto único a actualizar.
 */

export type BankStatus = 'ACTIVE' | 'INACTIVE' | 'DEGRADED';
export type IntegrationType = 'WEB_SCRAPING' | 'MOBILE_PROXY' | 'FILE_EXPORT' | 'HYBRID';

export interface Bank {
  id: string;
  name: string;
  country: string;
  status: BankStatus;
  integrationType: IntegrationType;
  adapterKey: string;
  createdAt: string;
}

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'REAUTH_REQUIRED' | 'SUSPENDED' | 'ERROR';

export interface BankAccount {
  id: string;
  bankId: string;
  bankName: string;
  merchantId: string;
  accountNumber: string;
  status: AccountStatus;
  syncEnabled: boolean;
  syncIntervalSeconds: number;
  lastSyncAt: string | null;
  createdAt: string;
}

export type MovementType = 'DEPOSIT' | 'TRANSFER' | 'WITHDRAWAL' | 'REVERSAL' | 'PAYMENT' | 'UNKNOWN';
export type MovementStatus = 'RECEIVED' | 'VALID' | 'INVALID' | 'DUPLICATE';

export interface Movement {
  id: string;
  accountId: string;
  reference: string;
  amount: number;
  currency: string;
  sender: string | null;
  receiver: string | null;
  movementType: MovementType;
  date: string;
  status: MovementStatus;
  verified: boolean;
  createdAt: string;
}

export type SyncStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';

export interface SyncLog {
  id: string;
  accountId: string;
  startedAt: string;
  finishedAt: string | null;
  status: SyncStatus;
  error: string | null;
  movementsFound: number;
  movementsNew: number;
  durationMs: number | null;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
}

/** Respuesta real de `GET /status` (Internal API, módulo 19) — distinta del health check de arriba. */
export interface SystemStatus {
  status: 'ok' | 'degraded';
  banks: { total: number; ACTIVE: number; INACTIVE: number; DEGRADED: number };
  accounts: {
    total: number;
    PENDING: number;
    ACTIVE: number;
    REAUTH_REQUIRED: number;
    SUSPENDED: number;
    ERROR: number;
  };
  accountsNeedingReconnection: number;
  timestamp: string;
}

export type AuditAction = 'LOGIN' | 'LOGOUT' | 'SYNC' | 'CONFIG_CHANGE' | 'ADMIN_OPERATION' | 'ERROR';
export type AuditResult = 'SUCCESS' | 'FAILURE';

export interface AuditLog {
  id: string;
  action: AuditAction;
  actor: string;
  entityType: string;
  entityId: string | null;
  result: AuditResult;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
}

export type AlertType = 'ACCOUNT_NOT_SYNCING' | 'HIGH_ERROR_RATE' | 'ACCOUNT_ESCALATED' | 'SERVICE_DEGRADED';
export type AlertSeverity = 'WARNING' | 'CRITICAL';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
