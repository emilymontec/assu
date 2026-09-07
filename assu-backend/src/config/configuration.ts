export default () => ({
  app: {
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '3000', 10),
    name: process.env.APP_NAME ?? 'collector',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  security: {
    credentialsEncryptionKey: process.env.CREDENTIALS_ENCRYPTION_KEY,
    credentialsEncryptionKeyPrevious: process.env.CREDENTIALS_ENCRYPTION_KEY_PREVIOUS || undefined,
    internalApiKey: process.env.INTERNAL_API_KEY,
  },
  scheduler: {
    defaultSyncIntervalSeconds: parseInt(process.env.DEFAULT_SYNC_INTERVAL_SECONDS ?? '60', 10),
  },
  rateLimiting: {
    maxRequestsPerBankPerMinute: parseInt(process.env.RATE_LIMIT_MAX_PER_BANK_PER_MINUTE ?? '20', 10),
    minSecondsBetweenAccountSyncs: parseInt(process.env.RATE_LIMIT_MIN_SECONDS_BETWEEN_ACCOUNT_SYNCS ?? '10', 10),
  },
  playwright: {
    headless: (process.env.PLAYWRIGHT_HEADLESS ?? 'true').toLowerCase() === 'true',
    timeoutMs: parseInt(process.env.PLAYWRIGHT_TIMEOUT_MS ?? '30000', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  events: {
    streamName: process.env.EVENTS_STREAM_NAME ?? 'collector.movements',
  },
  monitoring: {
    // Umbral mínimo; si syncIntervalSeconds*3 de una cuenta da un número
    // mayor, se usa ese (una cuenta que sincroniza cada 10 minutos no
    // debería alertar a los 30 si simplemente le tocaba cada rato largo).
    accountStaleThresholdMinutes: parseInt(process.env.MONITORING_STALE_THRESHOLD_MINUTES ?? '30', 10),
    errorRateWindowMinutes: parseInt(process.env.MONITORING_ERROR_RATE_WINDOW_MINUTES ?? '15', 10),
    errorRateThreshold: parseFloat(process.env.MONITORING_ERROR_RATE_THRESHOLD ?? '0.5'),
    errorRateMinSampleSize: parseInt(process.env.MONITORING_ERROR_RATE_MIN_SAMPLE ?? '3', 10),
    // Evita reenviar la MISMA alerta (mismo tipo + misma entidad) más
    // seguido que esto — sin esto, una cuenta caída dispararía una
    // alerta nueva cada 5 minutos indefinidamente.
    cooldownMinutes: parseInt(process.env.MONITORING_ALERT_COOLDOWN_MINUTES ?? '60', 10),
  },
  receipts: {
    // Ruta local para el adapter de referencia de ReceiptStoragePort.
    // En producción, reemplazar por un adapter de S3/GCS que implemente
    // el mismo puerto — nada más del sistema debería cambiar.
    storagePath: process.env.RECEIPTS_STORAGE_PATH ?? './storage/receipts',
  },
  ocr: {
    // 'tesseract' activa TesseractOcrAdapter (OCR real, local, sin
    // credenciales de nube). Cualquier otro valor deja NullOcrAdapter
    // (todo comprobante cae en MANUAL_REVIEW por diseño, nunca se
    // inventa un dato ni se verifica solo por defecto).
    provider: process.env.OCR_PROVIDER ?? 'null',
  },
  openWa: {
    // Identifica la sesión de WhatsApp Web guardada en disco
    // (node_modules/@open-wa/wa-automate deja los datos de sesión bajo
    // `sessionId.data.json` para no tener que escanear el QR en cada
    // arranque). Usa un valor distinto si necesitas correr más de una
    // sesión en la misma máquina.
    sessionId: process.env.OPENWA_SESSION_ID ?? 'assu-backend',
    // false para ver el navegador y escanear el QR la primera vez;
    // true para producción/demo ya autenticada.
    headless: (process.env.OPENWA_HEADLESS ?? 'true') === 'true',
    // open-wa controla UN número de WhatsApp por sesión — a diferencia
    // de WhatsApp Cloud API (donde la URL del webhook indicaba la
    // cuenta), aquí no hay forma de que el mensaje "diga" a qué cuenta
    // de Forttu Pagos pertenece. Para este demo, cada sesión de open-wa
    // está dedicada a una sola cuenta bancaria, configurada acá.
    bankAccountId: process.env.OPENWA_BANK_ACCOUNT_ID ?? null,
  },
});
