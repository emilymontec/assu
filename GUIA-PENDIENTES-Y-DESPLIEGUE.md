# Assu — Guía de Despliegue (Corregido para Windows)

> Despliegue de backend (NestJS) + frontend (Next.js).
> Backend y frontend corren en **dos terminales separadas** — ambos quedan en primer plano.

---

## 1. Configuración previa (una sola vez)

### 1.1 Backend — Regenerar lockfile
Abre **Git Bash** en la carpeta `assu-backend`:

```bash
cd assu-backend
pnpm install
```

Esto descarga/actualiza todas las dependencias y regenera `pnpm-lock.yaml`. Si ves `Packages: -16` (o similar), es normal — significa que quitó referencias al paquete viejo `@open-wa/wa-automate`.

### 1.2 Backend — Generar cliente de Prisma
Todavía en Git Bash, en `assu-backend`:

```bash
npx prisma generate
```

Verifica que salga:
```
✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in XXXms
```

### 1.3 Backend — Primera migración
```bash
pnpm prisma:migrate:dev --name init
```

O si `pnpm` te abre un CMD que no responde, usa:
```bash
npx prisma migrate dev --name init
```

### 1.4 Frontend — Regenerar lockfile
Abre una **nueva terminal Git Bash** en la carpeta `assu-frontend`:

```bash
cd assu-frontend
pnpm install
```

---

## 2. Levantar Backend (para desarrollo)

En Git Bash, dentro de `assu-backend`, asegúrate de haber hecho los pasos 1.1–1.3 arriba:

```bash
npx nest start --watch
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
- Verifica que estés en Git Bash, no PowerShell/CMD
- Verifica que `node_modules` exista (`pnpm install` completó)
- Intenta con: `node node_modules/.bin/nest start --watch`

---

## 3. Levantar Frontend (para desarrollo)

**En una terminal Git Bash separada**, dentro de `assu-frontend`:

```bash
npx next dev
```

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
```bash
cd assu-backend
pnpm install
npx prisma generate
npx prisma migrate deploy
pnpm run build
pnpm run start:prod
```

### Frontend
```bash
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

```bash
# Backend listo?
curl -H "x-api-key: TU_API_KEY" http://localhost:3000/status

# Frontend listo?
# Abre http://localhost:3100 en el navegador
```

---

## Notas Windows

- **Siempre usa Git Bash** para `pnpm` / `npx` / `node_modules\.bin\...` — no PowerShell ni CMD
- **Dos terminales:** una para backend, otra para frontend — jamás en la misma
- **Si `pnpm prisma:generate` abre CMD y no funciona** → usa `npx prisma generate` en su lugar
- **Si algo falla**, revisa que `pnpm-lock.yaml` y `node_modules` existan — si no, corre `pnpm install` de nuevo