# Imagen del backend (NestJS + Prisma + Playwright).
#
# IMPORTANTE: el contexto de build es la RAÍZ del monorepo, no
# assu-backend/. pnpm resuelve el workspace completo y hay un único
# pnpm-lock.yaml en la raíz, así que se construye con:
#
#   docker build -f assu-backend/docker/Dockerfile -t assu-backend:latest .
#
# (Docker Compose de la raíz ya hace esto; ver docker-compose.yml.)
# Este Dockerfile expone 3 etapas: `builder` (compila), `migrate`
# (aplica migraciones, target del servicio homónimo del compose) y
# `runtime` (imagen final de producción).

# ── Etapa 1: instalación de dependencias + build ─────────
FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# El .npmrc de la raíz fuerza PowerShell como script-shell (correcto en
# Windows, inexistente en Linux). Esta variable de entorno la sobreescribe
# solo dentro del contenedor para que los scripts corran con /bin/sh.
ENV npm_config_script_shell=/bin/sh

# Los manifiestos van primero para que la capa de `pnpm install` se
# reutilice mientras no cambien las dependencias.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY assu-backend/package.json assu-backend/
COPY assu-frontend/package.json assu-frontend/
COPY assu-home/package.json assu-home/
COPY assu-portal/package.json assu-portal/
COPY packages/assu-ui/package.json packages/assu-ui/
RUN pnpm install --frozen-lockfile

# Recién ahora el código fuente.
COPY . .

# Prisma Client se genera a partir del schema (el `build` ya lo garantiza
# vía su hook `prebuild`, pero se deja explícito para que quede claro qué
# artefacto necesita la etapa de runtime).
RUN pnpm --filter assu-backend exec prisma generate
RUN pnpm --filter assu-backend run build

# ── Etapa 2: migraciones (target `migrate`) ──────────────
# Reutiliza el builder porque necesita el CLI de Prisma (devDependency) y
# el schema. El compose lo corre una vez antes de arrancar el backend.
FROM builder AS migrate
CMD ["pnpm", "--filter", "assu-backend", "exec", "prisma", "migrate", "deploy"]

# ── Etapa 3: runtime ─────────────────────────────────────
# Se usa la imagen oficial de Playwright para no pelear con las librerías
# de sistema que Chromium necesita (mismo criterio que docker/scraper).
FROM mcr.microsoft.com/playwright:v1.47.0-jammy AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
ENV npm_config_script_shell=/bin/sh

# Instala solo las dependencias de producción del backend (node-linker=hoisted
# las deja en el node_modules de la raíz del workspace).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY assu-backend/package.json assu-backend/
COPY assu-frontend/package.json assu-frontend/
COPY assu-home/package.json assu-home/
COPY assu-portal/package.json assu-portal/
COPY packages/assu-ui/package.json packages/assu-ui/
RUN pnpm install --frozen-lockfile --prod --filter assu-backend

# El compilado, el schema (por si se quiere correr `prisma studio` a mano)
# y el cliente de Prisma YA generado en el builder (con --prod no se
# regenera, y `@prisma/client` lo necesita en runtime).
COPY --from=builder /app/assu-backend/dist ./assu-backend/dist
COPY --from=builder /app/assu-backend/prisma ./assu-backend/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# El WORKDIR queda dentro del backend para que las rutas relativas por
# defecto (RECEIPTS_STORAGE_PATH, DOCUMENT_PHOTOS_STORAGE_PATH) caigan en
# /app/assu-backend/storage.
WORKDIR /app/assu-backend

EXPOSE 3000
CMD ["node", "dist/main.js"]
