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
    internalApiKey: process.env.INTERNAL_API_KEY,
  },
  scheduler: {
    defaultSyncIntervalSeconds: parseInt(process.env.DEFAULT_SYNC_INTERVAL_SECONDS ?? '60', 10),
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
});
