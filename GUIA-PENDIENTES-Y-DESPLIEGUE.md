# Assu — Pendientes, Configuración, Despliegue y Pruebas

> Documento único de referencia: qué falta, cómo configurar, cómo
> desplegar (backend + frontend) y cómo probar la app como usuario
> final. Sigue el orden de las secciones — cada una depende de la
> anterior.

---

## 1. Puntos pendientes (paso a paso)

Estos son los únicos bloqueantes reales antes de usar Assu con datos de
verdad. Hazlos en este orden.

### 1.1 Regenerar el lockfile (pnpm)
El `package.json` ya tiene `telegraf` en vez de `@open-wa/wa-automate`,
pero `pnpm-lock.yaml` todavía referencia el paquete viejo.
```bash
cd assu-backend
pnpm install
```

### 1.2 Generar el cliente de Prisma
```bash
pnpm prisma:generate
```
> Si falla por red (error de checksum contra `binaries.prisma.sh`), es
> una limitación del entorno donde lo corras, no un problema del
> código — reintenta en tu máquina/servidor real.

### 1.3 Crear la primera migración
El proyecto todavía no tiene ninguna migración generada — vas a crear
la primera, que ya incluye el modelo completo (bancos, cuentas,
movimientos, verificación de pagos, canal `TELEGRAM`, etc.):
```bash
pnpm prisma:migrate:dev --name init
```

### 1.4 Crear el bot de Telegram
1. Abre un chat con [@BotFather](https://t.me/BotFather) en Telegram.
2. Envía `/newbot`, elige un nombre y un username terminado en `bot`
   (ej. `assu_receipts_bot`).
3. Guarda el token que te devuelve (formato
   `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).

### 1.5 Fase 0 de los adapters bancarios (pendiente de investigación real)
`BancolombiaAdapter` y `DaviplataAdapter` tienen selectores de
Playwright como placeholder — no van a funcionar contra el portal real
hasta hacer la investigación manual (igual que ya se hizo para Nequi).
```text
Metodología documentada en: assu-backend/docs/fase-0-nequi.md
Aplica sin cambios a los otros dos bancos — solo cambia la URL y los
selectores encontrados.
```
Riesgo ya identificado a validar primero: el PIN de Bancolombia usa
teclado virtual — `page.fill()` probablemente no sirva ahí.

### 1.6 Generar las claves de seguridad
```bash
# Clave de cifrado de credenciales bancarias (AES-256-GCM)
openssl rand -hex 32   # → CREDENTIALS_ENCRYPTION_KEY

# API key interna (protege todos los endpoints del backend)
openssl rand -hex 24   # → INTERNAL_API_KEY (backend) = ASSU_BACKEND_API_KEY (frontend)
```

Con esto completo, pasa a la sección 2 para configurar el entorno real.

---

## 2. Guía de configuración para despliegue (paso a paso)

### 2.1 Base de datos (Supabase)
1. Crea un proyecto en [supabase.com](https://supabase.com) (plan free
   sirve para empezar).
2. Ve a **Project Settings → Database → Connection string** y copia la
   cadena en modo **Transaction** (pooler, puerto 6543) para
   `DATABASE_URL`, y la de modo **Session** (puerto 5432) para
   `DIRECT_URL` si tu `schema.prisma` la usa.
3. Guarda ambas — las necesitas en el paso 2.4.

### 2.2 Redis
Cualquiera de estas opciones gratuitas sirve:
- [Upstash](https://upstash.com) (Redis serverless, plan free con
  límite de comandos/día — suficiente para empezar)
- Redis local vía Docker: `docker run -d -p 6379:6379 redis:7-alpine`

### 2.3 Bot de Telegram
Ya lo creaste en el paso 1.4. Ten a mano `TELEGRAM_BOT_TOKEN`.

### 2.4 Variables de entorno del backend
Copia `assu-backend/.env.example` → `assu-backend/.env` y completa:

```bash
NODE_ENV=production
PORT=3000
APP_NAME=assu

DATABASE_URL="<cadena de Supabase, modo Transaction>"

REDIS_HOST=<host de Upstash o localhost>
REDIS_PORT=<puerto>
REDIS_PASSWORD=<si aplica>

ENCRYPTION_PROVIDER=local
CREDENTIALS_ENCRYPTION_KEY=<generada en el paso 1.6>

INTERNAL_API_KEY=<generada en el paso 1.6>

OCR_PROVIDER=tesseract

TELEGRAM_BOT_TOKEN=<token de @BotFather>
TELEGRAM_BANK_ACCOUNT_ID=   # lo completas en el paso 4.3, después de crear la cuenta bancaria
```
El resto de las variables (`RATE_LIMIT_*`, `MONITORING_*`,
`SCRAPER_*`) ya tienen defaults razonables en `.env.example` — no
hace falta tocarlas para arrancar.

### 2.5 Variables de entorno del frontend
Copia `assu-frontend/.env.example` → `assu-frontend/.env.local`:
```bash
ASSU_BACKEND_API_URL=https://<tu-backend-desplegado>   # o http://localhost:3000 en local
ASSU_BACKEND_API_KEY=<el mismo INTERNAL_API_KEY del backend>
```

Con el entorno configurado, pasa a la sección 3 para desplegar.

---

## 3. Guía de despliegue (paso a paso)

### 3.1 Backend

**Local / VPS propio:**
```bash
cd assu-backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm run build
pnpm run start:prod
```

**Con Docker Compose (incluye Prometheus + Grafana):**
```bash
cd assu-backend/docker
docker compose up -d
```
Esto levanta Postgres local, Redis, Prometheus (`:9090`) y Grafana
(`:3001`) — si usas Supabase/Upstash externos, quita los servicios
`postgres`/`redis` del `docker-compose.yml` y apunta `DATABASE_URL`/
`REDIS_HOST` a los externos.

**Si usas `SCRAPER_ISOLATION_MODE=docker`** (cada sync de un banco en
un contenedor desechable):
```bash
docker build -t assu-backend-scraper:latest -f docker/scraper/Dockerfile .
```

Verifica que levantó bien:
```bash
curl -H "x-api-key: $INTERNAL_API_KEY" http://localhost:3000/status
```

### 3.2 Frontend

```bash
cd assu-frontend
pnpm install
pnpm run build
pnpm run start
```

**Despliegue en Vercel (recomendado, gratis para empezar):**
```bash
vercel --prod
```
Configura `ASSU_BACKEND_API_URL` y `ASSU_BACKEND_API_KEY` como
variables de entorno en el dashboard de Vercel, marcadas como
**secretas** (nunca con prefijo `NEXT_PUBLIC_`). El backend debe ser
accesible públicamente (o por IP allowlist) desde Vercel.

### 3.3 Checklist post-despliegue
- [ ] `GET /status` del backend responde `200`
- [ ] El frontend carga y el panel de bancos muestra datos (confirma
      que el proxy server-side llega al backend)
- [ ] En los logs del backend aparece `Bot de Telegram listo
      (long-polling).`
- [ ] `GET /metrics` del backend responde (verifica que Prometheus
      puede scrapear)

---

## 4. Guía para probar la app como usuario final (paso a paso)

Esta sección simula el flujo completo: un comercio recibe un pago por
Nequi/Daviplata y su cliente manda el comprobante por Telegram.

### 4.1 Registrar el banco
```bash
curl -X POST http://localhost:3000/banks \
  -H "Content-Type: application/json" -H "x-api-key: $INTERNAL_API_KEY" \
  -d '{"name":"Nequi","adapterKey":"nequi","country":"CO","integrationType":"WEB_SCRAPING"}'
```

### 4.2 Registrar la cuenta bancaria del comercio
```bash
curl -X POST http://localhost:3000/bank-accounts \
  -H "Content-Type: application/json" -H "x-api-key: $INTERNAL_API_KEY" \
  -d '{
    "bankId": "<id del banco creado en 4.1>",
    "merchantId": "mi-negocio-demo",
    "accountNumber": "3001234567",
    "credentials": { "phone": "3001234567", "pin": "1234" }
  }'
```
Copia el `id` de la cuenta que devuelve la respuesta.

### 4.3 Conectar la cuenta al bot de Telegram
En `assu-backend/.env`:
```bash
TELEGRAM_BANK_ACCOUNT_ID=<el id del paso 4.2>
```
Reinicia el backend para que tome el cambio.

### 4.4 Probar la detección de movimientos (lado banco)
1. Haz una transferencia real (o de prueba) a la cuenta Nequi
   registrada.
2. Espera al intervalo de sincronización (`DEFAULT_SYNC_INTERVAL_SECONDS`,
   60s por default) o fuerza una sincronización manual:
   ```bash
   curl -X POST http://localhost:3000/sync \
     -H "x-api-key: $INTERNAL_API_KEY" \
     -d '{"bankAccountId": "<id de 4.2>"}'
   ```
3. Confirma que el movimiento quedó guardado:
   ```bash
   curl "http://localhost:3000/movements?accountId=<id de 4.2>" \
     -H "x-api-key: $INTERNAL_API_KEY"
   ```

### 4.5 Probar la verificación de comprobante (lado cliente final)
1. Desde tu celular, busca tu bot en Telegram por el username que
   elegiste en el paso 1.4 y envíale la foto (o PDF) del comprobante
   de la transferencia que hiciste en 4.4.
2. Deberías recibir de inmediato: *"Recibimos tu comprobante, lo
   estamos verificando..."*
3. En 10-30 segundos (según el tamaño de la imagen y el OCR), el
   sistema procesa el comprobante. Verifica el resultado:
   ```bash
   curl "http://localhost:3000/payment-verifications?bankAccountId=<id de 4.2>" \
     -H "x-api-key: $INTERNAL_API_KEY"
   ```
   El `status` debería ser:
   - `VERIFIED` — el monto/referencia del comprobante coincidió con el
     movimiento real detectado en 4.4
   - `MANUAL_REVIEW` — si `OCR_PROVIDER=null` (OCR desactivado) o si
     el comprobante no coincidió con ningún movimiento
   - `UNVERIFIED` — el comprobante no pudo validarse

### 4.6 Probar desde el panel de administración (frontend)
1. Abre el frontend desplegado (o `http://localhost:3001` en local).
2. **Bancos** → confirma que Nequi aparece como `ACTIVE`.
3. **Cuentas** → confirma la cuenta creada en 4.2 y su última
   sincronización.
4. **Movimientos** → confirma el movimiento detectado en 4.4.
5. **Verificación de pagos** → confirma el `PaymentSubmission` del
   paso 4.5 y su estado final.
6. **Monitoreo** → revisa que no haya alertas activas sobre la cuenta
   de prueba.

Si los seis puntos de 4.6 muestran datos consistentes entre sí, el
flujo completo (banco → Telegram → OCR → conciliación → panel) está
funcionando de punta a punta.
