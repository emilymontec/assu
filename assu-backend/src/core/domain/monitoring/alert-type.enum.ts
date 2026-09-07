export enum AlertType {
  /** "Alertar cuenta sin sincronizar". */
  ACCOUNT_NOT_SYNCING = 'ACCOUNT_NOT_SYNCING',
  /** "Alertar tasa de errores elevada" (a nivel de sistema, no de una sola cuenta). */
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  /** "Alertar errores repetitivos" + "alertar problemas del adapter": se dispara cuando Retry & Error Handling escala una cuenta a ERROR. */
  ACCOUNT_ESCALATED = 'ACCOUNT_ESCALATED',
  /** "Alertar problemas del servicio" + "alertar sesiones caídas": Postgres o Redis (el session store) no responden. */
  SERVICE_DEGRADED = 'SERVICE_DEGRADED',
}
