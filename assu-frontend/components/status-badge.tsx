import { Badge } from '@/components/ui/badge';
import type { AccountStatus, BankStatus, SyncStatus } from '@/lib/types';

const ACCOUNT_STATUS_MAP: Record<AccountStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  ACTIVE: { label: 'Activa', variant: 'success' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
  REAUTH_REQUIRED: { label: 'Requiere reconexión', variant: 'danger' },
  SUSPENDED: { label: 'Suspendida', variant: 'default' },
  ERROR: { label: 'Error', variant: 'danger' },
};

const BANK_STATUS_MAP: Record<BankStatus, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  ACTIVE: { label: 'Activo', variant: 'success' },
  INACTIVE: { label: 'Inactivo', variant: 'default' },
  DEGRADED: { label: 'Degradado', variant: 'warning' },
};

const SYNC_STATUS_MAP: Record<SyncStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'accent' }> = {
  SUCCESS: { label: 'Exitosa', variant: 'success' },
  RUNNING: { label: 'En curso', variant: 'accent' },
  FAILED: { label: 'Falló', variant: 'danger' },
  PARTIAL: { label: 'Parcial', variant: 'warning' },
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const { label, variant } = ACCOUNT_STATUS_MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function BankStatusBadge({ status }: { status: BankStatus }) {
  const { label, variant } = BANK_STATUS_MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const { label, variant } = SYNC_STATUS_MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}
