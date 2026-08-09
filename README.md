# Collector — Forttu Pagos OpenSource

Microservicio desacoplado que se conecta a entidades financieras (bancos y
billeteras digitales), detecta movimientos nuevos y los entrega
normalizados al resto de la plataforma. **No utiliza APIs oficiales de open
banking**: la adquisición se realiza automatizando el canal digital de cada
entidad (portal web, principalmente vía Playwright).

Este repo contiene únicamente la **base** del proyecto. Los 23 módulos
funcionales del roadmap se agregan progresivamente dentro de `src/modules/`
(ver `src/modules/README.md` para la convención).

## Qué incluye esta base

- Bootstrap de NestJS con Pino (logs estructurados + redacción automática
  de credenciales), Swagger (`/docs`) y `ValidationPipe` global.
- `ConfigModule` global con validación estricta de variables de entorno
  (`class-validator`) — la app no arranca si falta una variable requerida.
- `PrismaModule` global conectado a PostgreSQL, con el schema de las 4
  tablas base: `banks`, `bank_accounts`, `bank_movements`, `sync_logs`
  (incluye el índice único de deduplicación).
- `src/core/domain/`: entidades de dominio puras (Bank, BankAccount,
  Movement, SyncLog) — sin dependencias de NestJS ni Prisma.
- `src/core/ports/`: contratos (`CollectorAdapter`, `EncryptionPort`,
  `EventPublisherPort`, `SessionStorePort`, `MovementRepositoryPort`) que
  cada módulo futuro implementará o consumirá.
- `src/core/base/playwright-adapter.base.ts`: clase base para todo adapter
  de banco, con manejo de browser/contexto, timeouts y captura de evidencia
  ante fallos — porque todo adapter futuro se apoyará en scraping, no en
  APIs oficiales.
- `src/common/errors/`: jerarquía `TransientError` vs `PermanentError`,
  usada por el `AllExceptionsFilter` para responder con el código HTTP
  correcto y, más adelante, por el módulo Retry & Error Handling.
- `GET /health`: endpoint de sanity check (verifica conexión a PostgreSQL).
- `docker/`: Postgres + Redis vía Docker Compose, y un Dockerfile
  multi-stage basado en la imagen oficial de Playwright para producción.

## Arranque local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env
# Generar CREDENTIALS_ENCRYPTION_KEY con: openssl rand -hex 32

# 3. Levantar Postgres + Redis
docker compose -f docker/docker-compose.yml up -d

# 4. Generar cliente Prisma y correr migraciones
pnpm run prisma:generate
pnpm run prisma:migrate:dev

# 5. (Solo si vas a implementar un adapter con Playwright)
pnpm run playwright:install

# 6. Arrancar en modo desarrollo
pnpm run start:dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/docs
- Health check: http://localhost:3000/health

## Siguiente paso

Según `src/modules/README.md`, el orden sugerido es:

1. **Bank Management** — CRUD de bancos + `adapterKey`.
2. **Credentials/Security** — cifrado AES-256-GCM (necesario antes de poder
   crear cuentas con credenciales reales).
3. **Bank Account Management** — depende de los dos anteriores.
4. **Bank Adapter System** — primer adapter real (Nequi) extendiendo
   `PlaywrightAdapterBase`.

Ver `Arquitectura-Collector-v1.md` para el detalle completo de los 23
módulos, sus pendientes por sprint y las decisiones de arquitectura.
