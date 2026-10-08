export default () => ({
  app: {
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '3000', 10),
    name: process.env.APP_NAME ?? 'assu',
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
    // 'local': AES-256-GCM con la clave en CREDENTIALS_ENCRYPTION_KEY (esta
    // variable de entorno). Simple y funciona, pero la clave "vive" en el
    // servidor — quien tenga acceso al proceso/entorno puede leerla.
    // 'aws-kms': cada encrypt()/decrypt() llama a AWS KMS; la clave real
    // NUNCA sale de KMS ni pasa por la memoria de este proceso — Assu
    // solo envía el texto plano/cifrado y KMS hace la operación criptográfica
    // del lado de AWS. Requiere AWS_KMS_KEY_ID (+ credenciales de AWS
    // estándar: variables de entorno, rol de IAM, etc. — no se gestionan acá).
    encryptionProvider: process.env.ENCRYPTION_PROVIDER ?? 'local',
    credentialsEncryptionKey: process.env.CREDENTIALS_ENCRYPTION_KEY,
    credentialsEncryptionKeyPrevious: process.env.CREDENTIALS_ENCRYPTION_KEY_PREVIOUS || undefined,
    internalApiKey: process.env.INTERNAL_API_KEY,
    awsKms: {
      region: process.env.AWS_KMS_REGION ?? 'us-east-1',
      keyId: process.env.AWS_KMS_KEY_ID,
    },
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
    // Sin PLAYWRIGHT_PROXY_SERVER, el scraping sale con la IP normal del
    // servidor. Con un proxy dedicado/residencial (Bright Data, Smartproxy,
    // Oxylabs, o una IP fija propia autorizada frente al banco) configurado
    // acá, cada AdapterFactoryService.create() lo hereda automáticamente —
    // ningún adapter individual necesita saber que existe.
    proxy: process.env.PLAYWRIGHT_PROXY_SERVER
      ? {
          server: process.env.PLAYWRIGHT_PROXY_SERVER,
          username: process.env.PLAYWRIGHT_PROXY_USERNAME,
          password: process.env.PLAYWRIGHT_PROXY_PASSWORD,
        }
      : undefined,
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  events: {
    streamName: process.env.EVENTS_STREAM_NAME ?? 'assu.movements',
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
  telegram: {
    // Token del bot, obtenido una sola vez vía @BotFather (gratis). Sin
    // este valor, TelegramClientService loguea un warning y el resto de
    // Assu sigue funcionando igual (el canal de ingesta por Telegram
    // simplemente no arranca).
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? null,
    // El bot de Telegram recibe mensajes de cualquier chat que le
    // escriba — a diferencia de un número de WhatsApp dedicado, aquí no
    // hay forma de que el mensaje "diga" a qué cuenta del comercio
    // pertenece. Para este sistema, cada bot está dedicado a una sola
    // cuenta bancaria, configurada acá. Si se necesitan varios
    // comercios, se despliega un bot (token) por comercio.
    bankAccountId: process.env.TELEGRAM_BANK_ACCOUNT_ID ?? null,
  },
  scraperIsolation: {
    // 'in-process' (default): el adapter corre Playwright dentro de este
    // mismo proceso de Node — rápido, sin dependencias extra, ideal para
    // desarrollo/demo. 'docker': cada login/sync/logout corre en un
    // contenedor `docker run --rm` desechable (ver docker/scraper/) que
    // se destruye apenas termina — más aislamiento, más lento, requiere
    // Docker disponible en el host donde corre Assu Backend.
    mode: process.env.SCRAPER_ISOLATION_MODE ?? 'in-process',
    dockerImage: process.env.SCRAPER_DOCKER_IMAGE ?? 'assu-backend-scraper:latest',
    // Más holgado que playwright.timeoutMs: además del timeout interno
    // del propio Playwright dentro del contenedor, hay que sumarle el
    // tiempo de arrancar el contenedor y a veces descargar la imagen.
    containerTimeoutMs: parseInt(
      process.env.SCRAPER_CONTAINER_TIMEOUT_MS ?? String(parseInt(process.env.PLAYWRIGHT_TIMEOUT_MS ?? '30000', 10) + 15000),
      10,
    ),
    // Red de Docker opcional — útil para forzar que el contenedor salga
    // por una red interna con el proxy residencial/IP dedicada ya
    // configurado a nivel de infraestructura, en vez de duplicar esa
    // config con PLAYWRIGHT_PROXY_* dentro del contenedor.
    dockerNetwork: process.env.SCRAPER_DOCKER_NETWORK || undefined,
  },
});
