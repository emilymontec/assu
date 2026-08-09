# Roadmap — COLLECTOR

> Plataforma de recolección de movimientos de cuentas bancarias OpenSource, construida con **NestJS** y **TypeScript**.

**Leyenda de estado:** `[ ]` pendiente · `[~]` en progreso · `[x]` completado

**Stack de referencia:**
- Frontend: Next.js + shadcn/ui
- Backend: NestJS + TypeScript
- ORM: Prisma
- Base de datos: PostgreSQL (Supabase)
- Browser Automation: Playwright

---

## 0. Infraestructura

- [x] Proyecto NestJS + TypeScript inicializado (`package.json`, `tsconfig.json`, `nest-cli.json`)
- [x] Gestor de paquetes **pnpm** configurado (`packageManager`, `.npmrc` con `shamefully-hoist`, `pnpm-lock.yaml` generado)
- [x] `pnpm install` validado (instala sin errores)
- [x] Compilación TypeScript validada (`tsc --noEmit` limpio, modo `strict`)
- [x] `.env.example` con todas las variables necesarias documentadas
- [x] `.gitignore` (incluye `node_modules`, `dist`, `.env`, `.pnpm-store`)
- [x] `ConfigModule` global con validación estricta de env vars (`class-validator`, fail-fast al arrancar)
- [x] `main.ts`: bootstrap con `ValidationPipe` global, Swagger (`/docs`), logger Pino
- [x] `AppModule` raíz con filtro de excepciones e interceptor de logging globales
- [x] Docker Compose con PostgreSQL 16 + Redis 7 (con healthchecks)
- [x] Dockerfile multi-stage (build + runtime sobre imagen oficial de Playwright), usando pnpm
- [x] README con instrucciones de arranque local
- [ ] CI/CD (build, test, deploy automático) — Fase 9 del roadmap
- [ ] Linter/formatter configurado (ESLint + Prettier) — no crítico para avanzar, pendiente

---

## Fase 0 — Investigación

- [ ] Documento técnico por banco (Nequi primero) — estrategia de integración
- [ ] Matriz de riesgos (probabilidad/impacto) por banco
- [ ] Revisión de términos y condiciones de cada banco (automatización/scraping)
- [ ] Documentar riesgos legales y operativos
- [ ] Definir política de manejo seguro de credenciales de los comercios

---

## Fase 1 — Arquitectura

- [x] Diagrama de arquitectura (componentes + flujo de datos) — ver `Arquitectura-Collector-v1.md`
- [x] Documento de contratos/interfaces (`CollectorAdapter`, DTOs base) — implementado en código, no solo documentado
- [x] Contrato `CollectorAdapter` definido y tipado (`login`, `sync`, `logout`)
- [x] Patrón de inyección de adaptadores diseñado (registry/factory) — **diseñado, no implementado aún** (ver Módulo 3)
- [x] Estrategia de reintentos y backoff definida a nivel de diseño (jerarquía `TransientError`/`PermanentError` ya en código)
- [x] Mecanismo de colas elegido y dependencia instalada (BullMQ + Redis) — **no configurado como módulo todavía**
- [ ] ADR (Architecture Decision Record) formal como documento separado

---

## Fase 2 — Modelo de datos

- [x] Schema Prisma completo: `Bank`, `BankAccount`, `Movement`, `SyncLog`
- [x] Índice único de deduplicación: `(account_id, reference, amount, date)`
- [x] Enums modelados (`BankStatus`, `CollectorType`, `AccountStatus`, `MovementType`, `MovementStatus`, `SyncStatus`)
- [x] Relaciones entre tablas definidas (`Bank → BankAccount → Movement/SyncLog`)
- [ ] `prisma generate` ejecutado contra una base real *(bloqueado en este sandbox por whitelist de red hacia `binaries.prisma.sh`; sin problema en tu entorno)*
- [ ] Migraciones ejecutadas (`prisma migrate dev`) — requiere Postgres levantado
- [ ] Seed de datos de prueba (`prisma/seed.ts`)
- [ ] Diagrama entidad-relación como artefacto visual separado
- [ ] Política de retención de `raw_data` definida (documento)

---

## Fase 3 — Motor de sincronización

- [ ] Scheduler configurable por cuenta (repeatable jobs BullMQ, default 60s)
- [ ] Login Manager con detección de sesión expirada y reintento automático
- [ ] **NequiAdapter** (banco piloto) funcional end-to-end
- [ ] Movement Parser (mapeo Nequi → `Movement` estándar)
- [ ] Lógica de deduplicación por `referencia + monto + fecha`
- [ ] Guardado de puntero "último movimiento leído" por cuenta
- [ ] Manejo de errores transitorios vs. permanentes en el flujo real de sync
- [x] Base para lo anterior ya existe: `PlaywrightAdapterBase` (browser/context/timeout/evidencia de fallo), entidad `Movement.fingerprint()`, campo `lastMovementReference` en `BankAccount`

---

## Fase 4 — Seguridad

- [~] Contrato `EncryptionPort` definido — **implementación AES-256-GCM pendiente**
- [ ] Rotación de claves de cifrado
- [ ] Auditoría poblándose (login, logout, sync, errores, cambios de configuración)
- [ ] Rate limiting por cuenta/banco
- [ ] Política de acceso a credenciales/logs/raw_data (documento)
- [ ] Revisión de cumplimiento normativo (habeas data Colombia, términos del banco)
- [x] Redacción automática de credenciales/tokens/cookies en logs (Pino `redact`, ya configurado)
- [x] `ApiKeyGuard` implementado para proteger endpoints internos (aplicable, aún no usado en ningún controller real más allá de estar disponible)

---

## Fase 5 — Observabilidad

- [x] Logging estructurado con Pino configurado (incluye modo pretty en dev)
- [x] Interceptor de logging de duración de requests HTTP
- [ ] Métricas Prometheus (duración de sync, movimientos, errores, reintentos, sesiones expiradas)
- [ ] Dashboard Grafana
- [ ] Alertas configuradas (ver Fase 9)
- [x] Endpoint `GET /health` como primer punto de observabilidad (verifica conexión a Postgres)

---

## Fase 6 — API interna

- [x] Swagger/OpenAPI configurado y sirviendo en `/docs`
- [x] `ValidationPipe` global con DTOs + `class-validator`
- [x] `PaginationDto` reutilizable ya creado
- [ ] `GET /api/movements` (con filtros por cuenta/fecha/estado)
- [ ] `POST /api/sync` (forzar sincronización manual)
- [ ] `GET /api/status` (estado general del Collector)
- [ ] `GET /api/last-sync` (última sincronización por cuenta)
- [ ] Colección de pruebas (Postman/Insomnia o tests e2e)

---

## Fase 7 — Eventos

- [x] Contrato `EventPublisherPort` + `DomainEvent<T>` definidos y versionados (`v1`)
- [ ] Broker de eventos configurado (Redis Streams)
- [ ] Publicación real de `movement.created` tras inserción exitosa
- [ ] Reintento de publicación si el broker falla
- [ ] Documentación del contrato de eventos para consumidores externos

---

## Fase 8 — QA y hardening

- [ ] Caso: depósitos simples
- [ ] Caso: transferencias entre cuentas
- [ ] Caso: devoluciones/reversos
- [ ] Caso: movimientos duplicados (misma referencia)
- [ ] Caso: montos iguales en fechas distintas (falso positivo)
- [ ] Caso: referencias vacías o nulas
- [ ] Caso: sesión expirada a mitad de sincronización
- [ ] Caso: banco caído / timeout
- [ ] Caso: cambio inesperado en el portal del banco (parser roto)
- [ ] Caso: credenciales revocadas o inválidas
- [ ] Pruebas de carga sobre el Scheduler
- [ ] Pruebas de resiliencia (matar proceso a mitad de sync)
- [ ] Pentest básico sobre credenciales y API interna

---

## Fase 9 — Despliegue

- [x] Containerización con Docker (Dockerfile multi-stage, imagen Playwright)
- [x] Docker Compose para MVP (Postgres + Redis, con healthchecks)
- [ ] CI/CD (build, test, deploy automático)
- [ ] Alertas activas (cuenta sin sincronizar, tasa de error, sesión caída)
- [ ] Manual de soporte (reconectar cuenta, revisar errores, sync manual)
- [ ] Procedimiento operativo para cambio de portal/reautenticación
- [ ] Servicio corriendo en producción con banco piloto

---

## Checklist por módulo (visión funcional — 23 módulos)

### 1. Bank Management
- [x] Entidad de dominio `Bank` + enums (`BankStatus`, `CollectorType`)
- [x] Modelo Prisma `banks`
- [ ] `bank.module.ts` / `bank.controller.ts` / `bank.service.ts`
- [ ] CRUD (registrar, consultar, activar/desactivar)
- [ ] Endpoint para listar bancos disponibles

### 2. Bank Account Management
- [x] Entidad de dominio `BankAccount` + enum `AccountStatus`
- [x] Modelo Prisma `bank_accounts` (con `encrypted_credentials`, `last_sync_at`, `last_movement_reference`)
- [ ] `bank-account.module.ts` / controller / service
- [ ] CRUD + asociación banco↔merchant
- [ ] Endpoint de sincronización manual por cuenta
- [ ] Detección de cuentas que requieren reconexión (`needsReconnection()` ya existe en la entidad, falta exponerlo)

### 3. Bank Adapter System
- [x] Contrato `CollectorAdapter` (`login`, `sync`, `logout`)
- [x] `PlaywrightAdapterBase` (clase base para scraping con Playwright)
- [ ] `AdapterRegistry` (mapear `bank.adapterKey` → clase concreta)
- [ ] `AdapterFactory` (instanciar el adapter correcto)
- [ ] Primer adapter real (`NequiAdapter`)

### 4. Authentication / Login Manager
- [x] Errores tipados (`InvalidCredentialsError`, `TransientLoginError`)
- [ ] `LoginManagerService` (login, detección de sesión expirada, renovación)
- [ ] Lógica de "cuenta necesita reautenticación" conectada a `BankAccount.markReauthRequired()`

### 5. Session Manager
- [x] Contrato `SessionStorePort` (`get`, `save`, `invalidate`, `isExpired`)
- [ ] Implementación sobre Redis
- [ ] Limpieza automática de sesiones expiradas

### 6. Scheduler
- [ ] Nada implementado aún (dependencia `@nestjs/schedule` y BullMQ ya instaladas)

### 7. Sync Engine
- [ ] Nada implementado aún (es el orquestador central, depende de los módulos 3–5 y 8–11)

### 8. Movement Parser
- [ ] Nada implementado aún

### 9. Movement Validator
- [ ] Nada implementado aún

### 10. Movement Deduplication
- [x] `Movement.fingerprint()` en la entidad de dominio
- [x] Índice único en base de datos como última línea de defensa
- [ ] Servicio explícito de deduplicación (comparación previa a insertar)

### 11. Movement Management
- [x] Entidad de dominio `Movement` + enums (`MovementType`, `MovementStatus`)
- [x] Modelo Prisma `bank_movements`
- [x] Contrato `MovementRepositoryPort`
- [ ] Implementación del repositorio (Prisma)
- [ ] `movement.controller.ts` con filtros (cuenta/fecha/estado)

### 12. Sync Log / Synchronization History
- [x] Entidad de dominio `SyncLog` (con `durationMs`, `finish()`)
- [x] Modelo Prisma `sync_logs`
- [ ] Servicio + repositorio
- [ ] Endpoint de consulta de historial

### 13. Retry & Error Handling
- [x] Jerarquía de errores `TransientError` / `PermanentError` (con subtipos: `TimeoutError`, `BankUnavailableError`, `InvalidCredentialsError`, `PortalStructureChangedError`)
- [x] `AllExceptionsFilter` ya distingue transitorio (503) vs. permanente (422)
- [ ] Estrategia de backoff exponencial real
- [ ] Límite de reintentos configurable
- [ ] Marcado automático de cuenta con problemas tras N fallos

### 14. Queue / Job Management
- [x] Dependencias instaladas (`@nestjs/bullmq`, `bullmq`, `ioredis`)
- [ ] `QueueModule` configurado
- [ ] Processor de sincronización (`sync.processor.ts`)
- [ ] Control de concurrencia y prioridades

### 15. Credentials / Security
- [x] Contrato `EncryptionPort` (`encrypt`, `decrypt`)
- [x] Variable `CREDENTIALS_ENCRYPTION_KEY` ya en `.env.example` y validada en `env.validation.ts`
- [ ] Implementación AES-256-GCM
- [ ] Rotación de claves

### 16. Audit
- [ ] Nada implementado aún (no hay tabla ni servicio de auditoría todavía — falta agregar `AuditLog` al schema Prisma)

### 17. Rate Limiting
- [ ] Nada implementado aún

### 18. Event Publisher
- [x] Contrato `EventPublisherPort` + `DomainEvent<T>` versionado
- [x] Variable `EVENTS_STREAM_NAME` ya en `.env.example`
- [ ] Implementación sobre Redis Streams
- [ ] Reintento ante fallo del broker

### 19. Internal API
- [x] Swagger configurado (`/docs`)
- [x] `GET /health`
- [ ] `GET /movements`, `POST /sync`, `GET /status`, `GET /last-sync`

### 20. API Authentication / Authorization
- [x] `ApiKeyGuard` implementado
- [ ] Aplicado a los endpoints reales cuando existan (`/movements`, `/sync`, etc.)
- [ ] Evaluar mTLS a futuro (no urgente en MVP)

### 21. Observability
- [x] Pino con redacción de datos sensibles
- [x] Interceptor de logging HTTP
- [ ] Métricas Prometheus
- [ ] Dashboard Grafana

### 22. Monitoring & Alerts
- [ ] Nada implementado aún

### 23. Admin / Operations
- [ ] Nada implementado aún

---

## Notas finales

- Cada fase se considera "cerrada" cuando su entregable está funcionando en el entorno de desarrollo y ha sido validado manualmente contra los criterios de esta lista.
- Este documento es vivo: debe actualizarse marcando checkboxes y agregando notas de decisiones tomadas durante el desarrollo.