# Convención para nuevos módulos

Cada módulo del roadmap vive en su propia carpeta aquí, siguiendo esta forma:

```
modules/<nombre-modulo>/
├── <nombre>.module.ts
├── <nombre>.controller.ts      # solo si expone HTTP
├── <nombre>.service.ts
├── dto/                        # solo si expone HTTP o eventos
└── repositories/                # solo si persiste datos
```

Reglas:
1. Un módulo solo accede a datos de otro módulo a través de su servicio
   público o del puerto correspondiente en `src/core/ports/`.
2. Todo lo específico de un banco vive exclusivamente en
   `bank-adapter/adapters/<banco>/`.
3. Antes de agregar un módulo nuevo, revisar `core/ports/`.

## Estado

- [x] **Bank Management** — CRUD completo, protegido con ApiKeyGuard.
- [x] **Credentials/Security** — AES-256-GCM local o AWS KMS (a elección,
  `ENCRYPTION_PROVIDER`) + rotación de claves + atestación obligatoria de
  credenciales de solo lectura, 13 tests unitarios.
- [x] **Bank Account Management** — CRUD, rotación de credenciales, suspender/reactivar, 14 tests unitarios.
- [x] **Bank Adapter System** — Registry + Factory + NequiAdapter,
  BancolombiaAdapter, DaviplataAdapter (los tres con selectores
  placeholder, Fase 0 pendiente); proxy dedicado/residencial opcional; modo
  de aislamiento en Docker (`DockerIsolatedAdapter`, contenedor desechable
  por operación) opcional — ver "Endurecimiento de seguridad" en el README
  raíz. 50 tests unitarios.
- [x] **Session Manager** — RedisSessionStoreService + SessionManagerService, TTL nativo de Redis, 18 tests unitarios.
- [x] **Login Manager** — orquesta Bank Account + Bank + Bank Adapter + Session Manager, 10 tests unitarios.
- [x] **Scheduler** — BullMQ repeatable jobs, frecuencia por cuenta, resync automático cada 5 min, 8 tests unitarios.
- [x] **Movement Parser** — registro por adapterKey + parser de Nequi, 8 tests.
- [x] **Movement Validator** — validación estructural (monto/fecha/moneda), 7 tests.
- [x] **Movement Management** — repositorio Prisma real (faltaba desde el inicio) + controller `/movements`, 5 tests.
- [x] **Movement Deduplication** — clave compuesta resuelve referencias vacías sin lógica especial, 2 tests.
- [x] **Sync Log** — historial de sync + controller `/sync-logs`, 4 tests.
- [x] **Event Publisher** — Redis Streams (XADD) con reintento simple.
- [x] **Sync Engine** — el orquestador completo: Login → Consultar → Normalizar → Validar → Comparar → Guardar → Publicar evento. `POST /sync` lo dispara manualmente. 8 tests unitarios.
- [x] **Queue/Job Management** — `SyncProcessor` consume la cola real y ejecuta `SyncEngineService.syncAccount()`. Ciclo automático completo. 4 tests unitarios.
- [x] **Retry & Error Handling** — clasifica errores (transitorio/permanente), `UnrecoverableError` para no reintentar lo permanente, escala cuentas a `ERROR` tras 5 fallos seguidos. 8 tests unitarios.
- [x] **Rate Limiting** — contador de ventana fija sobre Redis, límite por banco y por cuenta, chequeado antes de intentar login. 10 tests unitarios.
- [ ] Audit (siguiente)
- [ ] resto de módulos — ver `Roadmap-Collector-Checklist.md`

## Verificación de comprobantes (Payment Verification) — nuevo

Módulo agregado a pedido explícito, fuera de los 23 módulos originales de
detección de movimientos. Vive en cinco módulos separados, todos bajo
`src/modules/`:

- **`open-wa-client`** — dueño exclusivo del cliente de
  [open-wa](https://github.com/open-wa/wa-automate-nodejs) (WhatsApp Web
  automatizado). Módulo "hoja" sin dependencias del resto del sistema,
  para que tanto `receipt-ingestion` (recibir) como `payment-verification`
  (responder) puedan usarlo sin depender uno del otro.
- **`receipt-ingestion`** — se suscribe a los mensajes entrantes vía
  `OpenWaClientService`, descarga y valida el adjunto, y crea el
  `PaymentSubmission` de forma idempotente. No expone ningún webhook
  HTTP — a diferencia de WhatsApp Cloud API, aquí no hay nada externo
  que pueda "llamar" a un endpoint público, porque no existe: el propio
  proceso de Collector es el cliente de WhatsApp.
- **`receipt-processing`** — validación de archivo, hash sha256,
  `OcrPort` (`NullOcrAdapter` por defecto — placeholder honesto, siempre
  confianza `LOW`; o `TesseractOcrAdapter` con `OCR_PROVIDER=tesseract`,
  OCR real local sin credenciales de nube) y señales de fraude por
  reutilización de hash.
- **`reconciliation-engine`** — motor determinístico (referencia + monto +
  ventana de tiempo) con 7 tests unitarios.
- **`payment-verification`** — orquestador con máquina de estados
  auditada (`RECEIVED → PROCESSING → PENDING_MOVEMENT → MATCHING →
  VERIFIED/AMBIGUOUS/REJECTED/ERROR/MANUAL_REVIEW`), compare-and-swap
  contra condiciones de carrera, endpoint de revisión manual
  (`POST /payment-verifications/:id/manual-review`) y API interna
  (`GET /payment-verifications`).

Reglas de diseño que no deben romperse al extender esto:

1. Un movimiento nunca se reutiliza para dos comprobantes — lo garantiza
   la constraint única en `PaymentSubmission.matchedMovementId` (BD), no
   solo el código de aplicación.
2. Un fallo técnico (OCR caído, timeout) nunca se traduce en `REJECTED`
   — va a `ERROR`. Solo hay evidencia real (`NO_MATCH` del motor de
   conciliación) para rechazar.
3. `REJECTED`/`AMBIGUOUS`/`MANUAL_REVIEW` → `VERIFIED` solo ocurre vía
   `manualReview()`, con un actor humano identificado y auditado —
   revisar `MANUAL_TRANSITIONS` en `payment-verification.constants.ts`
   antes de "simplificar" esto.

Pendiente antes de producción: reemplazar `LocalReceiptStorageAdapter`
por un adapter de S3/GCS implementando `ReceiptStoragePort` — no
requiere tocar el resto del sistema.

**OCR**: ya hay un adapter real (`TesseractOcrAdapter`, Tesseract.js +
`pdf-parse`) — actívalo con `OCR_PROVIDER=tesseract` en `.env`. Sus
patrones de extracción (`receipt-text-parser.ts`) están hechos con
comprobantes colombianos típicos en mente pero DEBEN ajustarse con
comprobantes reales de Nequi/Bancolombia/Daviplata apenas se tengan —
agregar un patrón nuevo ahí no requiere tocar el resto del pipeline.
Mientras no se active, `NullOcrAdapter` (el default) manda todo a
`MANUAL_REVIEW` — nunca un falso `VERIFIED`.

**Selectores reales de Nequi**: ver `docs/fase-0-nequi.md` — es trabajo
que requiere una cuenta real de Nequi y no se puede completar sin eso.

**WhatsApp (open-wa)**: la primera vez que arranques con
`OPENWA_HEADLESS=false` vas a tener que escanear un QR con el WhatsApp
de la cuenta que uses para el demo — la sesión queda guardada en disco
y no hace falta repetirlo en arranques siguientes. `OPENWA_BANK_ACCOUNT_ID`
es obligatorio para que la ingesta funcione: a diferencia de WhatsApp
Cloud API (donde la URL del webhook indicaba la cuenta), open-wa
controla un solo número por sesión, así que todo comprobante que llegue
se asocia a esa única cuenta bancaria configurada.

