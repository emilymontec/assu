/**
 * Nombre de la cola BullMQ y del job de sincronización. Se centralizan
 * aquí porque tanto el productor (SchedulerService, este módulo) como el
 * futuro consumidor (Queue/Job Management, módulo 14) necesitan usar
 * exactamente los mismos valores para hablar de la misma cola.
 */
export const SYNC_QUEUE_NAME = 'sync-account';
export const SYNC_JOB_NAME = 'sync-account-job';

export interface SyncJobData {
  accountId: string;
}
