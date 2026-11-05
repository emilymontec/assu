# Imagen de la landing pública (assu-home, puerto 3200).
#
# IMPORTANTE: el contexto de build es la RAÍZ del monorepo, no esta
# carpeta. pnpm resuelve el workspace completo y hay un único
# pnpm-lock.yaml en la raíz, así que se construye con:
#
#   docker build -f assu-home/Dockerfile -t assu-home:latest .
#
# (Docker Compose de la raíz ya hace esto; ver docker-compose.yml.)

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

# Recién ahora el código fuente, y el build de esta app únicamente.
COPY . .

# NEXT_PUBLIC_* se INLINEA en el bundle durante `next build` y las páginas
# de la landing se prerenderizan en ese momento, así que la URL del portal
# queda grabada en la imagen: si no se pasa aquí, el enlace usaría el
# valor por defecto y cambiar el `.env` después no tendría efecto (haría
# falta reconstruir: docker compose up -d --build home).
ARG NEXT_PUBLIC_PORTAL_URL=http://localhost:3300
ENV NEXT_PUBLIC_PORTAL_URL=${NEXT_PUBLIC_PORTAL_URL}

RUN pnpm --filter assu-home run build

# ── Etapa 2: runtime ─────────────────────────────────────
# `output: 'standalone'` deja en .next/standalone un server.js con solo los
# archivos que se usan en runtime (incluye packages/assu-ui porque
# outputFileTracingRoot apunta a la raíz del workspace). No hace falta
# pnpm install en esta etapa.
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Como el tracing root es la raíz del monorepo, la app queda anidada en
# standalone/assu-home/ y los node_modules trazados en standalone/node_modules.
COPY --from=builder /app/assu-home/.next/standalone ./
COPY --from=builder /app/assu-home/.next/static ./assu-home/.next/static

ENV PORT=3200
ENV HOSTNAME=0.0.0.0
EXPOSE 3200

CMD ["node", "assu-home/server.js"]
