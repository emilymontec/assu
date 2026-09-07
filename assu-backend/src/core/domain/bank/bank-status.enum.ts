export enum BankStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEGRADED = 'DEGRADED', // el banco existe pero su integración está fallando (portal caído, etc.)
}

/**
 * Cómo el Collector obtiene los movimientos de este banco.
 * Este proyecto NO usa APIs oficiales de open banking: todo se resuelve
 * mediante automatización del canal digital del banco (web/app) con Playwright,
 * o mediante exportables (CSV/PDF) cuando el portal no es viable de automatizar.
 */
export enum CollectorType {
  WEB_SCRAPING = 'WEB_SCRAPING', // Playwright sobre el portal web del banco
  MOBILE_PROXY = 'MOBILE_PROXY', // interceptación de tráfico de la app móvil
  FILE_EXPORT = 'FILE_EXPORT', // descarga/lectura de CSV o PDF exportado
  HYBRID = 'HYBRID', // combinación de las anteriores
}
