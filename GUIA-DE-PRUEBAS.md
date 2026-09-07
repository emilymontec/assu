# Guía para probar Assu (backend + frontend)

Esta guía asume que ya descomprimiste el proyecto y tienes Node.js 20+,
pnpm y Docker instalados. Corre todos los comandos **en tu máquina**, no
en un sandbox sin acceso a `binaries.prisma.sh` — Prisma necesita
descargar su motor de query engine la primera vez.

---

## 1. Infraestructura local (Postgres + Redis)

Desde `assu-backend/`:

```bash
cd assu-backend
docker compose -f docker/docker-compose.yml up -d postgres redis
```

Verifica que ambos estén sanos:

```bash
docker ps
```

Deberías ver `assu-postgres` y `assu-redis` como `healthy`.

(Prometheus y Grafana son opcionales para probar funcionalidad — solo
hacen falta si quieres revisar el módulo de Observability/Monitoring.)

---

## 2. Backend (NestJS)

### 2.1 Instalar dependencias

```bash
cd assu-backend
corepack enable
pnpm install
```

### 2.2 Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y como mínimo revisa:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Ya viene lista para el Postgres del docker-compose |
| `REDIS_HOST` / `REDIS_PORT` | Ya vienen listos |
| `INTERNAL_API_KEY` | Cámbiala por cualquier string; la usarás en todas las llamadas a la API |
| `RECEIPTS_STORAGE_PATH` | Carpeta local donde se guardan los comprobantes recibidos (por defecto `./storage/receipts`) |
| `OCR_PROVIDER` | Déjala en `null` (default) para el placeholder, o ponla en `tesseract` para activar OCR real (Tesseract.js + `pdf-parse`, sin credenciales de nube — ver sección 5.3) |
| `OPENWA_*` | Solo necesarias si vas a probar la ingesta real por WhatsApp (sección 5.2) — no requieren cuenta de Meta, solo un número de WhatsApp real |

### 2.3 Generar Prisma Client y correr migraciones

```bash
pnpm run prisma:generate
pnpm run prisma:migrate:dev
```

Esto crea todas las tablas, incluyendo las nuevas `payment_submissions` y
`verification_events`. Si te pide un nombre para la migración, escribe
algo como `add_payment_verification`.

### 2.4 Correr los tests unitarios

```bash
pnpm test
```

Debe terminar con algo como `Test Suites: 27 passed` / `Tests: ~198 passed`
(el número exacto puede variar levemente según la versión del código).
Si quieres correr solo el motor de conciliación:

```bash
pnpm test reconciliation-engine
```

### 2.5 Levantar el backend

```bash
pnpm run start:dev
```

- API en `http://localhost:3000`
- Swagger (documentación interactiva) en `http://localhost:3000/docs`
- Todos los endpoints (excepto el webhook de WhatsApp) requieren el
  header `x-api-key: <tu INTERNAL_API_KEY>`

### 2.6 Prueba rápida de humo (smoke test)

```bash
# Estado general del servicio
curl http://localhost:3000/status -H "x-api-key: TU_API_KEY"

# Crear un banco
curl -X POST http://localhost:3000/banks \
  -H "Content-Type: application/json" -H "x-api-key: TU_API_KEY" \
  -d '{"name":"Nequi","adapterKey":"nequi","country":"CO","collectorType":"SCRAPING"}'
```

Si esto responde `200`/`201`, el backend, la base de datos y Redis están
correctamente conectados.

---

## 3. Frontend (assu-frontend, Next.js)

El panel es un proxy: nunca habla directo con el backend de Assu desde
el navegador, todo pasa por `app/api/backend/[...path]/route.ts` en el
servidor de Next.

### 3.1 Instalar y configurar

```bash
cd ../assu-frontend
pnpm install
cp .env.example .env.local
```

Edita `.env.local`:

```
ASSU_BACKEND_API_URL=http://localhost:3000
ASSU_BACKEND_API_KEY=TU_API_KEY   # el mismo valor que INTERNAL_API_KEY del backend
```

### 3.2 Levantar el frontend

El backend ya ocupa el puerto 3000, así que arranca el admin en otro:

```bash
pnpm dev -- -p 3100
```

Abre `http://localhost:3100`. Todo lo que hagas ahí (ver bancos, cuentas,
movimientos, etc.) debería reflejar exactamente lo que ves por Swagger/curl
contra el backend, ya que pasa por el mismo API.

---

## 4. Probar el flujo original de Assu (detección de movimientos)

1. Crea un banco (`POST /banks`), una cuenta (`POST /bank-accounts`) y
   verifica que el Scheduler la programe: revisa los logs del backend, o
   `GET /status` para ver cuentas activas.
2. Como `NequiAdapter` tiene los selectores de Playwright pendientes
   (Fase 0 del roadmap), la sincronización real contra el portal fallará
   — es esperado. Para probar el pipeline de todas formas, corre los
   tests unitarios de `sync-engine` y `movement-*`, que usan mocks:
   ```bash
   pnpm test sync-engine movement
   ```
3. Para ver movimientos ya guardados (si insertas alguno manualmente vía
   Prisma Studio: `pnpm run prisma:studio`), usa:
   ```bash
   curl "http://localhost:3000/movements?accountId=<id>" -H "x-api-key: TU_API_KEY"
   ```

---

## 5. Probar el módulo de verificación de comprobantes

### 5.1 Modo simulado (sin WhatsApp real) — recomendado para probar rápido

Este modo prueba OCR → conciliación → estados sin necesitar WhatsApp
conectado. Inserta un `PaymentSubmission` directamente y deja que el
sistema lo procese:

1. Crea un banco, una cuenta y (opcional) un movimiento manualmente vía
   Prisma Studio:
   ```bash
   pnpm run prisma:studio
   ```
   En la tabla `bank_movements`, crea un registro de prueba con un
   `reference`, `amount` y `date` que recuerdes.

2. Inserta un `PaymentSubmission` en estado `RECEIVED` apuntando a esa
   cuenta (mismo Prisma Studio, tabla `payment_submissions`). Como
   `fileStorageRef` usa cualquier string — con `OCR_PROVIDER` en su
   valor por defecto (`null`), el submission quedará en `MANUAL_REVIEW`
   por baja confianza (comportamiento esperado y documentado: no hay un
   proveedor de OCR real conectado a menos que actives la sección 5.3).

3. Encola el procesamiento manualmente desde un script Node/REPL, o
   simplemente espera: si prefieres probar la API sin tocar la base de
   datos directamente, usa los endpoints de solo lectura y de revisión
   manual:
   ```bash
   # Listar comprobantes
   curl "http://localhost:3000/payment-verifications" -H "x-api-key: TU_API_KEY"

   # Ver uno en detalle
   curl "http://localhost:3000/payment-verifications/<id>" -H "x-api-key: TU_API_KEY"

   # Ver su audit trail (por qué pasó de un estado a otro)
   curl "http://localhost:3000/payment-verifications/<id>/events" -H "x-api-key: TU_API_KEY"

   # Forzar una revisión manual (verificarlo a mano, como haría un operador)
   curl -X POST "http://localhost:3000/payment-verifications/<id>/manual-review" \
     -H "Content-Type: application/json" -H "x-api-key: TU_API_KEY" \
     -d '{"toStatus":"VERIFIED","reason":"Confirmado manualmente en prueba","actor":"tu-nombre@forttu.co"}'
   ```

4. Para probar el motor de conciliación de forma aislada y rápida (sin
   base de datos), corre sus tests:
   ```bash
   cd assu-backend
   pnpm test reconciliation-engine
   ```
   Ahí ya ves ejemplos reales de `EXACT_MATCH`, `PROBABLE_MATCH`,
   `AMBIGUOUS_MATCH`, `NO_MATCH` y `PENDING`.

### 5.2 Modo real con WhatsApp (open-wa)

La ingesta usa [open-wa](https://github.com/open-wa/wa-automate-nodejs)
(WhatsApp Web automatizado), no WhatsApp Cloud API — no necesitas cuenta
de Meta ni Business API, solo un número de WhatsApp real (puede ser tu
propio celular o uno de prueba) y escanear un QR una vez.

1. Crea al menos una cuenta bancaria (`POST /bank-accounts`) y copia su
   `id`.
2. En `assu-backend/.env`:
   ```bash
   OPENWA_SESSION_ID=assu-backend
   OPENWA_HEADLESS=false   # para poder VER el navegador y escanear el QR
   OPENWA_BANK_ACCOUNT_ID=<el id que copiaste>
   ```
3. Levanta el backend (`pnpm run start:dev`). Se abrirá una ventana de
   Chromium controlada por Playwright/Puppeteer con un código QR.
4. Desde el WhatsApp de tu celular: Ajustes → Dispositivos vinculados →
   Vincular un dispositivo, y escanea el QR.
5. Una vez vinculado, verás en los logs del backend algo como
   `Cliente de WhatsApp (open-wa) listo — sesión "assu-backend"`.
   La sesión queda guardada en disco (`assu-backend.data.json`), así
   que no vas a tener que volver a escanear el QR en próximos arranques
   — puedes volver a poner `OPENWA_HEADLESS=true`.
6. Desde el mismo celular (o desde otro número, hablándole al que
   vinculaste), envía una foto o PDF de un comprobante. Deberías:
   - Recibir una respuesta automática de "Recibimos tu comprobante..."
   - Ver el nuevo `PaymentSubmission` con `GET /payment-verifications`
   - Verlo avanzar de estado en los logs del backend. Con
     `OCR_PROVIDER=null` (default) llega a `MANUAL_REVIEW` siempre; con
     `OCR_PROVIDER=tesseract` (sección 5.3) puede llegar directo a
     `VERIFIED` si el monto/referencia coinciden con un movimiento.

**Nota importante**: open-wa controla un único número de WhatsApp por
sesión, y ese número queda dedicado a la cuenta bancaria que pusiste en
`OPENWA_BANK_ACCOUNT_ID` — a diferencia de WhatsApp Cloud API, aquí no
hay una URL de webhook distinta por cuenta. Para un demo con una sola
cuenta esto es suficiente; para varias cuentas simultáneas habría que
correr una sesión de open-wa por cuenta (procesos separados).

### 5.3 Activar OCR real (Tesseract.js, sin cuenta de Google/AWS)

Ya no es obligatorio quedarse en `MANUAL_REVIEW` por falta de OCR:

```bash
# en assu-backend/.env
OCR_PROVIDER=tesseract
```

Reinicia el backend. La primera vez que llegue un comprobante,
Tesseract descarga el modelo de idioma español (~15MB) desde internet —
puede tardar unos segundos extra esa primera vez.

Prueba el parser de texto (la parte que interpreta lo que el OCR leyó)
de forma aislada y rápida, sin necesitar una imagen real:

```bash
pnpm test receipt-text-parser
```

Con esto activo, un comprobante real por WhatsApp con buena calidad de
imagen debería poder llegar a `VERIFIED` automáticamente si el monto y
la referencia coinciden con un movimiento — ya no se queda forzosamente
en `MANUAL_REVIEW`. Si tus comprobantes reales no se están extrayendo
bien, ajusta las expresiones regulares en
`src/modules/receipt-processing/receipt-text-parser.ts` (están
documentadas y tienen sus propios tests) sin tocar el resto del
pipeline.

### 5.4 Selectores reales de Nequi (Fase 0)

Esto es lo único de la tabla de la sección 6 que **no** se resuelve
solo con configuración — requiere que alguien con acceso a una cuenta
real de Nequi inspeccione el portal. Sigue la guía paso a paso en
[`docs/fase-0-nequi.md`](./docs/fase-0-nequi.md).

---

## 6. Qué NO vas a poder probar todavía (y por qué)

| Pendiente | Motivo |
|---|---|
| Sincronización real contra el portal de Nequi | `NequiAdapter` tiene los selectores de Playwright pendientes (Fase 0 del roadmap: investigación real del portal). Ver `docs/fase-0-nequi.md` — requiere una cuenta real de Nequi, no se puede resolver solo con configuración |

Con `OCR_PROVIDER=tesseract` (sección 5.3) y open-wa conectado (sección
5.2), el `EXACT_MATCH` de punta a punta por WhatsApp puede funcionar
solo. Lo único que le falta al flujo completo es la Fase 0 de Nequi para
que la detección de movimientos en sí sea real (hoy el `NequiAdapter` no
puede loguearse contra el portal real todavía).

---

## 7. Checklist rápido de "todo funciona"

- [ ] `docker ps` muestra Postgres y Redis healthy
- [ ] `pnpm test` (backend) pasa sin fallos
- [ ] `pnpm test reconciliation-engine` pasa sus 7 tests
- [ ] `curl http://localhost:3000/status` responde 200
- [ ] Swagger carga en `http://localhost:3000/docs`
- [ ] El admin en `http://localhost:3100` muestra los bancos/cuentas creados por curl
- [ ] `POST /payment-verifications/:id/manual-review` cambia el estado y aparece en `GET /payment-verifications/:id/events`
