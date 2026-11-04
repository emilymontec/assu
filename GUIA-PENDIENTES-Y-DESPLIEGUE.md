# Assu — Guía de Despliegue (Corregido para Windows)

> Despliegue de backend (NestJS) + frontend (Next.js).
> Backend y frontend corren en **dos terminales separadas** — ambos quedan en primer plano.

---

## 1. Configuración previa (una sola vez)

### 1.1 Backend — Regenerar lockfile
Abre **PowerShell** en la carpeta `assu-backend`:

```powershell
cd assu-backend
pnpm install
```

Esto descarga/actualiza todas las dependencias y regenera `pnpm-lock.yaml`. Si ves `Packages: -16` (o similar), es normal — significa que quitó referencias al paquete viejo `@open-wa/wa-automate`.

> **Si parece congelado, no lo está.** pnpm no imprime progreso en todos los
> terminales. Corre `pnpm install --reporter=append-only` para ver el avance
> paquete por paquete.

### 1.2 Backend — Generar cliente de Prisma
Todavía en PowerShell, en `assu-backend`:

```powershell
pnpm run prisma:generate
```

Verifica que salga:
```
✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in XXXms
```

### 1.3 Backend — Primera migración
```powershell
pnpm run prisma:migrate:dev --name init
```

### 1.4 Frontend — Regenerar lockfile
Abre una **nueva terminal PowerShell** en la carpeta `assu-frontend`:

```powershell
cd assu-frontend
pnpm install
```

---

## 2. Levantar Backend (para desarrollo)

En PowerShell, dentro de `assu-backend`, asegúrate de haber hecho los pasos 1.1–1.3 arriba:

```powershell
pnpm run start:dev
```

**Esperado:**
```
[Nest] 12345  10/26/2026, 19:45:00     LOG [NestFactory] Starting Nest application...
[Nest] 12345  10/26/2026, 19:45:02     LOG [InstanceLoader] BankModule dependencies initialized +15ms
...
[Nest] 12345  10/26/2026, 19:45:05     LOG [NestApplication] Nest application successfully started +2ms
```

Una vez que veas `successfully started`, el backend está listo en `http://localhost:3000`.

**Si da error `Could not determine executable to run`:**
- Verifica que `node_modules` exista y que `pnpm install` haya terminado por completo
- Intenta con: `pnpm exec nest start --watch`

---

## 3. Levantar Frontend (para desarrollo)

**En una terminal Git Bash separada**, dentro de `assu-frontend`:

```bash
pnpm dev
```

El puerto `3100` ya viene fijo en `package.json` (el backend ocupa el
3000) — no uses `npx next dev` directo, ese sí arrancaría en el 3000 y
chocaría con el backend.

**Esperado:**
```
> assu-frontend@0.1.0 dev
> next dev

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3100
  - Environments: .env.local

 ✓ Ready in 2.5s
```

Frontend está listo en `http://localhost:3100`.

---

## 4. Variables de entorno (.env)

### Backend: `assu-backend/.env`
```bash
NODE_ENV=development
PORT=3000
APP_NAME=assu

DATABASE_URL="postgresql://user:password@localhost:5432/assu"
DIRECT_URL="postgresql://user:password@localhost:5432/assu"

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

ENCRYPTION_PROVIDER=local
CREDENTIALS_ENCRYPTION_KEY=<generada con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

INTERNAL_API_KEY=<generada con: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))">

OCR_PROVIDER=tesseract

TELEGRAM_BOT_TOKEN=<token de @BotFather>
TELEGRAM_BANK_ACCOUNT_ID=
```

### Frontend: `assu-frontend/.env.local`
```bash
ASSU_BACKEND_API_URL=http://localhost:3000
ASSU_BACKEND_API_KEY=<el mismo INTERNAL_API_KEY del backend>
```

---

## 5. Despliegue en producción

### Backend
```powershell
cd assu-backend
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate:deploy
pnpm run build
pnpm run start:prod
```

### Frontend
```powershell
cd assu-frontend
pnpm install
pnpm run build
pnpm run start
```

### Con Docker (incluye Postgres + Redis + Prometheus + Grafana)
```bash
cd assu-backend/docker
docker compose up -d
```

---

## 6. Verificar que funciona

```powershell
# Backend listo?
Invoke-RestMethod -Uri http://localhost:3000/status -Headers @{ "x-api-key" = "TU_API_KEY" }

# Frontend listo?
# Abre http://localhost:3100 en el navegador
```

---

## Notas Windows

- **Usa PowerShell** (no `cmd.exe`) para `pnpm` / `pnpm exec` / `node_modules\.bin\...`.
  El `script-shell` del `.npmrc` en la raíz ya fuerza PowerShell, así que
  `pnpm run <script>` no abre un CMD.
- **Dos terminales:** una para backend, otra para frontend — jamás en la misma
- **Si `pnpm install` parece congelado**, no lo está: pnpm no imprime progreso en
  todos los terminales. Corre `pnpm install --reporter=append-only` para ver el
  avance real paquete por paquete.
- **Sobre este equipo:** el disco es un HDD de 5400 RPM y Windows Defender tiene la
  protección en tiempo real activa, así que la primera instalación completa de las
  4 apps tarda bastante. No la cortes; las siguientes son rápidas (el store de pnpm
  ya queda poblado).
- **Si algo falla**, revisa que `pnpm-lock.yaml` y `node_modules` existan — si no, corre `pnpm install` de nuevo

---

## 7. Portal de Comercios y landing pública

Esta guía solo cubre backend + panel admin. El portal de comercios
(`assu-portal`, puerto 3300) y la landing pública (`assu-home`, puerto
3200) son dos apps más del mismo monorepo, con su propio quickstart en
el [README.md](./README.md) de la raíz.