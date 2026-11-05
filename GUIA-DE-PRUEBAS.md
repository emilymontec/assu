# Assu — Guía de configuración y despliegue con Docker

Esta guía lleva el monorepo completo (**backend NestJS + 3 frontends
Next.js + Postgres + Redis**) a contenedores, paso a paso y desde cero.
Al terminar tendrás el stack corriendo con un solo comando y sabrás cómo
operarlo, verificarlo y actualizarlo.

> Todos los comandos están escritos para **PowerShell** (Windows). Si
> usas Linux/macOS, los mismos comandos funcionan salvo los de la
> sección 3.2 para generar secretos.

---

## 0. Qué se levanta

### 0.1 Servicios y puertos

| Servicio | Qué es | Puerto en tu máquina | Acceso |
|---|---|---|---|
| `postgres` | Base de datos (Postgres 16) | — (solo red interna) | `docker compose exec postgres psql` |
| `redis` | Colas BullMQ + sesiones + rate limiting | — (solo red interna) | `docker compose exec redis redis-cli` |
| `migrate` | Job de una sola vez: `prisma migrate deploy` | — | termina y sale |
| `backend` | API NestJS (Swagger en `/docs`) | `3000` | http://localhost:3000 |
| `admin` | Panel de administración (ops) | `3100` | http://localhost:3100 |
| `home` | Landing pública | `3200` | http://localhost:3200 |
| `portal` | Portal de Comercios (login/registro) | `3300` | http://localhost:3300 |
| `prometheus` | Métricas (perfil opcional) | `9090` | http://localhost:9090 |
| `grafana` | Dashboards (perfil opcional) | `3001` | http://localhost:3001 |

### 0.2 Archivos Docker del proyecto

| Archivo | Para qué |
|---|---|
| `docker-compose.yml` (raíz) | Orquesta todo el stack |
| `.env.example` (raíz) | Plantilla de variables del stack (copiar a `.env`) |
| `.dockerignore` (raíz) | Excluye `node_modules`, `.next`, `.env`, etc. del contexto de build |
| `assu-backend/docker/Dockerfile` | Imagen del backend (etapas `builder`, `migrate`, `runtime`) |
| `assu-frontend/Dockerfile` | Imagen del panel admin (Next.js standalone) |
| `assu-home/Dockerfile` | Imagen de la landing (Next.js standalone) |
| `assu-portal/Dockerfile` | Imagen del portal (Next.js standalone) |
| `assu-backend/docker/prometheus/prometheus.docker.yml` | Scrape de Prometheus apuntando al contenedor `backend` |

**Detalle importante:** todas las imágenes se construyen con **contexto = la
raíz del monorepo** (no cada carpeta por separado). El proyecto usa un
único `pnpm-lock.yaml` en la raíz y un solo `pnpm-workspace.yaml`, así que
el contexto debe ser la raíz para que `pnpm install --frozen-lockfile`
resuelva el workspace completo. El `docker-compose.yml` ya lo hace así.

---

## 1. Requisitos previos

### 1.1 Docker

Necesitas **Docker Desktop** (incluye el motor y `docker compose`). Verifica:

```powershell
docker version
docker compose version
```

- `docker version` debe mostrar la sección `Server` (si dice *"failed to
  connect ... dockerDesktopLinuxEngine"*, **abre Docker Desktop** y espera
  a que arranque).
- `docker compose version` debe responder `v2.x`.

### 1.2 Windows: exclusiones de Windows Defender (recomendado)

En este proyecto el disco es lento y Defender escanea en tiempo real, lo
que hace que las instalaciones y los builds parezcan congelados. Agrega
exclusiones en **PowerShell como Administrador**:

```powershell
Add-MpPreference -ExclusionPath "C:\Users\DESKTOP\Desktop\assu"
Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\pnpm"
Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\Docker"
```

### 1.3 Internet durante el build

El build de los frontends **descarga la tipografía Manrope desde
`fonts.gstatic.com`** (Next.js la integra en tiempo de compilación). Si tu
red bloquea ese dominio, el build del frontend fallará con
`request to https://fonts.gstatic.com/... failed`. Necesitas acceso
saliente para construir las imágenes (después, para correrlas, ya no).

---

## 2. Paso 1 — Situarse en la raíz del proyecto

```powershell
cd C:\Users\DESKTOP\Desktop\assu
```

Todos los comandos del resto de la guía se ejecutan **desde aquí**, porque
el `docker-compose.yml` y el `.env` viven en la raíz.

---

## 3. Paso 2 — Crear el archivo `.env`

### 3.1 Copiar la plantilla

```powershell
Copy-Item .env.example .env
```

### 3.2 Generar y pegar los 3 secretos obligatorios

El compose **falla de inmediato** si alguno queda vacío (es a propósito:
mejor fallar que arrancar con un secreto débil). Genera cada uno con:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejecútalo **3 veces** y pega cada resultado en `.env`:

| Variable | Qué protege |
|---|---|
| `CREDENTIALS_ENCRYPTION_KEY` | Cifra las credenciales bancarias (AES-256-GCM) |
| `INTERNAL_API_KEY` | API interna del backend; es la MISMA que usa el panel admin |
| `AUTH_JWT_SECRET` | Firma los JWT de sesión de los comercios en el portal |

Si no tienes Node instalado en el host, puedes generarlos con Python
(`python -c "import secrets; print(secrets.token_hex(32))"`) o con `openssl
rand -hex 32`.

### 3.3 Variables que querrás revisar

El resto del `.env` trae valores por defecto funcionales. Lo que conviene
tocar según lo que vayas a probar:

| Variable | Para qué |
|---|---|
| `POSTGRES_PASSWORD` | Cambia el `assu` por defecto si esto no es local |
| `OCR_PROVIDER` | `null` (default) o `tesseract` para OCR real (sección 11.3) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BANK_ACCOUNT_ID` | Ingesta de comprobantes por Telegram (sección 11.2) |
| `EMAIL_PROVIDER` | `console` (default, solo loguea) o `smtp` para correos reales del portal |
| `MONITORING_NOTIFIER` / `MONITORING_ALERT_EMAILS` | `email` para recibir alertas por correo |
| `NEXT_PUBLIC_PORTAL_URL` / `PORTAL_APP_URL` | Deben apuntar al **puerto 3300** (el portal), no al 3100. Ojo: `NEXT_PUBLIC_PORTAL_URL` se graba en el bundle al construir la landing, así que tras cambiarla hay que reconstruirla (`docker compose up -d --build home`) |

> `.env` está en `.gitignore`: no se sube al repositorio. Nunca lo
> commitees con secretos reales.

---

## 4. Paso 3 — Construir las imágenes

```powershell
docker compose build
```

Qué va a pasar, en orden:

1. Se construye primero la imagen del **backend** (`assu-backend/docker/Dockerfile`),
   que expone 3 etapas: `builder` (instala dependencias del workspace y
   compila con `nest build`), `migrate` (reutiliza el builder + el CLI de
   Prisma) y `runtime` (imagen final sobre Playwright con Chromium y sus
   librerías de sistema ya instaladas).
2. Luego los 3 frontends, cada uno con `output: 'standalone'`. La imagen
   final copia solo `.next/standalone`, `.next/static` y el `server.js`,
   sin `node_modules` completo: son imágenes delgadas.
3. La primera vez tarda bastante (descarga imágenes base, instala todo el
   workspace y descarga la fuente Manrope). Las siguientes builds son
   mucho más rápidas gracias al caché de capas.

Para construir una sola imagen:

```powershell
docker compose build backend
docker compose build admin
```

> **Si el build parece congelado** en el paso `pnpm install`, no lo está:
> pnpm no imprime progreso granular. Confirma que Defender esté excluido
> (sección 1.2) y espera.

---

## 5. Paso 4 — Levantar el stack

```powershell
docker compose up -d
```

Compose respeta este orden:

1. `postgres` y `redis` arrancan y deben quedar `healthy` (healthcheck).
2. `migrate` espera a Postgres, aplica las migraciones de Prisma y
   **termina**. El backend no arranca hasta que este job salga con éxito.
3. `backend` arranca en `:3000`. Está marcado `service_healthy`: expone
   `GET /health` y Compose lo sondea hasta que responde.
4. `admin`, `home` y `portal` arrancan en `:3100`, `:3200` y `:3300`
   recién cuando el backend está sano.

Verifica el estado:

```powershell
docker compose ps
```

Deberías ver `postgres` y `redis` como `healthy`, `migrate` como `exited
(0)` y `backend`/`admin`/`home`/`portal` como `running`.

Confirma que las migraciones se aplicaron:

```powershell
docker compose logs migrate
```

La primera vez debería terminar con algo como `All migrations have been
successfully applied.`

Y mira los logs del backend:

```powershell
docker compose logs -f backend
```

Cuando veas `Assu escuchando en http://localhost:3000 — docs en /docs`, ya
está listo. `Ctrl+C` deja de seguir los logs (no detiene el contenedor).

---

## 6. Paso 5 — Verificar que todo funciona

### 6.1 Backend

```powershell
# Healthcheck (no requiere API key)
Invoke-RestMethod -Uri http://localhost:3000/health

# Estado general (requiere la API key)
Invoke-RestMethod -Uri http://localhost:3000/status -Headers @{ 'x-api-key' = 'TU_INTERNAL_API_KEY' }
```

Cambia `TU_INTERNAL_API_KEY` por el valor real que pusiste en `.env`.

Swagger (documentación interactiva de toda la API) en
http://localhost:3000/docs

### 6.2 Frontends

| App | URL | Qué mirar |
|---|---|---|
| Panel admin | http://localhost:3100 | Listados de bancos, cuentas, movimientos y monitoreo |
| Landing | http://localhost:3200 | Hero, secciones y los enlaces legales (`/privacidad`, `/terminos`, …) |
| Portal de Comercios | http://localhost:3300 | `/registro` y `/login` (el registro/login vive **aquí**, no en el panel admin) |

### 6.3 Checklist rápido

- [ ] `docker compose ps` muestra `postgres` y `redis` healthy
- [ ] `docker compose logs migrate` termina sin errores
- [ ] `Invoke-RestMethod http://localhost:3000/health` responde `status = ok`
- [ ] Swagger carga en http://localhost:3000/docs
- [ ] El panel admin (3100) muestra los datos que crees por API
- [ ] El portal (3300) muestra `/login` y `/registro`
- [ ] La landing (3200) enlaza al portal en el **puerto 3300**

---

## 7. Paso 6 — Crear datos de prueba

Un banco y una cuenta bancaria, usando la API con la API key interna:

```powershell
$headers = @{ 'x-api-key' = 'TU_INTERNAL_API_KEY' }

# 1) Crear un banco
$bank = @{
  name            = 'Nequi'
  adapterKey      = 'nequi'
  country         = 'CO'
  integrationType = 'WEB_SCRAPING'
} | ConvertTo-Json

$created = Invoke-RestMethod -Method Post -Uri http://localhost:3000/banks `
  -Headers $headers -ContentType 'application/json' -Body $bank

$created

# 2) Crear una cuenta bancaria asociada a ese banco.
#    confirmedReadOnlyCredentials es OBLIGATORIO: la API responde 400 si
#    falta o si viene en false (es la salvaguarda de "solo lectura").
$account = @{
  bankId                      = $created.id
  merchantId                  = 'assu-demo'
  accountNumber               = '3001234567'
  credentials                 = @{ phone = '3001234567'; pin = '1234' }
  confirmedReadOnlyCredentials = $true
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3000/bank-accounts `
  -Headers $headers -ContentType 'application/json' -Body $account
```

Refresca el panel admin en http://localhost:3100: el banco y la cuenta
deberían aparecer, porque el panel consulta el mismo backend a través de
su proxy server-side.

> **Nota:** la sincronización real contra el portal de Nequi todavía no
> funciona — los selectores de Playwright están pendientes (Fase 0). Ver
> sección 11.4.

---

## 8. Paso 7 — Observabilidad (opcional)

Prometheus y Grafana están en el perfil `observability`, así que **no**
se levantan con el comando normal. Para incluirlos:

```powershell
docker compose --profile observability up -d
```

- **Prometheus**: http://localhost:9090 — scrapea `backend:3000/metrics`
  cada 15s (config en `assu-backend/docker/prometheus/prometheus.docker.yml`).
- **Grafana**: http://localhost:3001 — entra sin credenciales (modo
  anónimo, solo para uso local). Los dashboards `Assu` y
  `Collector Overview` ya vienen aprovisionados.

Si ya tenías el stack levantado, el comando de arriba solo agrega los dos
servicios nuevos. Para levantarlos desde cero: `docker compose --profile
observability up -d --build`.

---

## 9. Operación del día a día

### 9.1 Cambiar de configuración

Edita `.env` y recrea solo el servicio afectado:

```powershell
docker compose up -d backend        # aplica el nuevo .env al backend
docker compose up -d                # recrea lo que haya cambiado
```

> Excepción: `NEXT_PUBLIC_PORTAL_URL` (usado por la landing) se graba en el
> bundle al compilar, no se lee en runtime. Para cambiarlo:
> `docker compose up -d --build home`.

### 9.2 Reconstruir tras cambiar código

Los contenedores sirven código **compilado**, así que un cambio en el
código fuente requiere reconstruir la imagen:

```powershell
docker compose up -d --build portal   # ejemplo: solo el portal
docker compose up -d --build          # todo el stack
```

### 9.3 Aplicar una migración nueva

El servicio `migrate` corre una sola vez por `up`. Si agregas una
migración a `assu-backend/prisma/migrations/`, aplícala explícitamente:

```powershell
docker compose run --rm migrate
```

### 9.4 Logs, reinicio y parada

```powershell
docker compose logs -f backend      # seguir logs de un servicio
docker compose logs --tail 100      # últimos 100 de todos
docker compose restart backend
docker compose stop                 # detiene sin borrar
docker compose down                 # detiene y borra contenedores (conserva volúmenes)
```

> `docker compose down -v` **borra los volúmenes** (base de datos,
> comprobantes y fotos de documentos incluidos). Úsalo solo si quieres
> empezar de cero.

### 9.5 Volúmenes y datos

| Volumen | Contenido |
|---|---|
| `assu_assu-postgres-data` | Base de datos Postgres |
| `assu_assu-redis-data` | Datos de Redis |
| `assu_assu-storage` | Comprobantes y fotos de documentos (cifradas) en `/app/assu-backend/storage` |
| `assu_assu-grafana-data` / `assu_assu-prometheus-data` | Datos de observabilidad |

```powershell
docker volume ls
```

### 9.6 Conectarse a la base de datos

```powershell
docker compose exec postgres psql -U assu -d assu
# \dt  para listar tablas, \q para salir
```

### 9.7 Respaldo y restauración

```powershell
# Respaldo
docker compose exec -T postgres pg_dump -U assu -d assu > respaldo.sql

# Restauración
Get-Content respaldo.sql | docker compose exec -T postgres psql -U assu -d assu
```

---

## 10. Antes de pasar a producción

- **Secrets:** genera valores reales (nunca los de ejemplo) y guárdalos en
  un gestor de secretos, no en el repo.
- **Marcadores legales:** reemplaza los textos entre corchetes de
  `assu-home/lib/legal.ts` (razón social, NIT, dirección y correo de
  habeas data) antes de publicar la landing.
- **Correo real:** `EMAIL_PROVIDER=smtp` + `SMTP_*` para que el portal
  envíe códigos de verificación y recuperación de contraseña de verdad.
- **Alertas reales:** `MONITORING_NOTIFIER=email` + `MONITORING_ALERT_EMAILS`.
- **Cifrado de credenciales:** valora `ENCRYPTION_PROVIDER=aws-kms` para
  que la clave nunca viva en el servidor.
- **TLS y exposición:** los puertos `3100`/`3200`/`3300`/`3000` se publican
  para pruebas. En producción, pon un reverse proxy con HTTPS delante y no
  expongas el backend directamente.
- **Postgres/Redis** ya quedan sin publicar al host: solo se alcanzan por
  la red interna del compose.

---

## 11. Pruebas funcionales del stack

### 11.1 Pruebas unitarias (sin Docker)

```powershell
pnpm install --reporter=append-only
pnpm --filter assu-backend test
```

Pruebas puntuales útiles:

```powershell
pnpm --filter assu-backend test reconciliation-engine
pnpm --filter assu-backend test receipt-text-parser
pnpm --filter assu-backend test bank-adapter sync-engine movement
```

### 11.2 Ingesta de comprobantes por Telegram

La ingesta usa la Bot API oficial de Telegram (Telegraf): gratis, sin
límite de mensajes y sin riesgo de bloqueo por automatización.

1. Crea una cuenta bancaria por API (sección 7) y copia su `id`.
2. Crea el bot una sola vez: abre [@BotFather](https://t.me/BotFather),
   envía `/newbot`, elige nombre y un username que termine en `bot`.
   BotFather te devuelve un token como
   `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`.
3. En `.env` de la raíz:
   ```
   TELEGRAM_BOT_TOKEN=<el token>
   TELEGRAM_BANK_ACCOUNT_ID=<el id de la cuenta>
   ```
4. Recrea el backend: `docker compose up -d backend`. En los logs
   verás `Bot de Telegram listo (long-polling).`
5. Desde tu celular, busca el bot y envía una foto o PDF. Recibirás una
   respuesta automática y aparecerá un `PaymentSubmission`.

Consulta los comprobantes:

```powershell
$headers = @{ 'x-api-key' = 'TU_INTERNAL_API_KEY' }

Invoke-RestMethod "http://localhost:3000/payment-verifications" -Headers $headers
Invoke-RestMethod "http://localhost:3000/payment-verifications/<id>/events" -Headers $headers

# Forzar una revisión manual (una sola línea a propósito)
$body = @{ toStatus = 'VERIFIED'; reason = 'Confirmado manualmente'; actor = 'tu-nombre@assu.app' } | ConvertTo-Json
Invoke-RestMethod -Method Post "http://localhost:3000/payment-verifications/<id>/manual-review" -Headers $headers -ContentType 'application/json' -Body $body
```

### 11.3 Activar OCR real (Tesseract, sin cuentas de nube)

En `.env`: `OCR_PROVIDER=tesseract` y recrea el backend. La primera vez,
Tesseract descarga el modelo de español (~15 MB). Con esto, un comprobante
real con buena calidad de imagen puede llegar a `VERIFIED`
automáticamente si el monto y la referencia coinciden con un movimiento;
sin esto, todo cae en `MANUAL_REVIEW` (comportamiento esperado).

### 11.4 Lo que todavía no se puede probar

| Pendiente | Motivo |
|---|---|
| Sincronización real contra el portal de Nequi | `NequiAdapter` tiene los selectores de Playwright pendientes (Fase 0): requiere una cuenta real de Nequi. Guía paso a paso en [`assu-backend/docs/fase-0-nequi.md`](./assu-backend/docs/fase-0-nequi.md) |

---

## 12. Alternativa: desarrollar sin Docker

Útil cuando quieres recarga en caliente. Levanta solo la infraestructura
en Docker y corre las apps en el host:

```powershell
# 1) Infraestructura en Docker (solo Postgres + Redis)
cd C:\Users\DESKTOP\Desktop\assu\assu-backend
docker compose -f docker/docker-compose.yml up -d postgres redis

# 2) Backend: instalar, migrar y arrancar con recarga en caliente
Copy-Item .env.example .env   # apunta DATABASE_URL/REDIS_* a localhost
pnpm install --reporter=append-only
pnpm run prisma:generate
pnpm run prisma:migrate:dev
pnpm run start:dev

# 3) Frontends, en otra terminal (desde la raíz del monorepo)
cd C:\Users\DESKTOP\Desktop\assu
pnpm --filter assu-home run dev     # 3200
pnpm --filter assu-portal run dev   # 3300
pnpm --filter assu-frontend run dev # 3100
```

El detalle de este flujo está en
[GUIA-PENDIENTES-Y-DESPLIEGUE.md](./GUIA-PENDIENTES-Y-DESPLIEGUE.md).

> No mezcles ambos modos a la vez: la infra de `assu-backend/docker` y la
> del compose de la raíz usan el mismo puerto de Postgres/Redis. Una u otra.

---

## 13. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `failed to connect ... dockerDesktopLinuxEngine` | El daemon de Docker no está corriendo | Abre Docker Desktop y espera a que arranque |
| `failed to solve: ... pnpm-lock.yaml: not found` | Contexto de build incorrecto | Construye con el contexto de la **raíz**: `docker compose build` (no `docker build` desde una subcarpeta) |
| `error: required variable CREDENTIALS_ENCRYPTION_KEY is missing` | Falta un secreto en `.env` | Complétalo (sección 3.2) |
| Build del frontend falla con `fonts.gstatic.com ... ECONNRESET` | Sin salida a internet durante el build | Habilita el acceso saliente y reconstruye |
| El build "se congela" en `pnpm install` | Defender escaneando en tiempo real + disco lento | Agrega las exclusiones (sección 1.2) |
| `backend` reinicia en bucle | Las migraciones fallaron o Postgres no estaba listo | `docker compose logs migrate` y `docker compose logs postgres` |
| `migrate` sale con error `P3005` (base ya no vacía) | Se apuntó a una base con datos previos | Usa la base del compose o haz `prisma migrate resolve` según el caso |
| El panel admin (3100) devuelve 401 | `INTERNAL_API_KEY` del frontend no coincide con la del backend | Es la misma variable en el `.env` de la raíz: corrige y recrea ambos servicios |
| El portal (3300) no envía correos | `EMAIL_PROVIDER=console` (default) | Cambia a `smtp` y define `SMTP_*` |
| `bind: address already in use` | Otro proceso ocupa el puerto (3000/3100/3200/3300) | Para el proceso o cambia el mapeo en `docker-compose.yml` |
| Cambié el código y el contenedor sirve lo viejo | Los contenedores usan código compilado | Reconstruye: `docker compose up -d --build <servicio>` |
| Un cambio en `.env` no surte efecto | El contenedor no se recreó | `docker compose up -d <servicio>` |

---

## 14. Resumen de comandos

```powershell
# Preparación (una vez)
cd C:\Users\DESKTOP\Desktop\assu
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # x3

# Construir y levantar
docker compose build
docker compose up -d
docker compose ps

# Con observabilidad
docker compose --profile observability up -d

# Verificación
Invoke-RestMethod -Uri http://localhost:3000/health
# Panel admin  http://localhost:3100
# Landing      http://localhost:3200
# Portal       http://localhost:3300
# Swagger      http://localhost:3000/docs

# Actualizar
docker compose up -d --build
docker compose run --rm migrate

# Operar
docker compose logs -f backend
docker compose restart backend
docker compose down          # conserva datos
docker compose down -v       # ¡borra los datos!
```
