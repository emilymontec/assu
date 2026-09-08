# Contenedor desechable de scraping (Práctica de seguridad #4: aislamiento
# en contenedores). Cada `docker run --rm` de esta imagen corre UNA sola
# operación (login, sync o logout) contra UN banco y se destruye al salir
# — nunca queda un contenedor vivo con credenciales o cookies adentro.
#
# Build (desde la raíz de assu-backend/):
#   docker build -f docker/scraper/Dockerfile -t assu-backend-scraper:latest .
#
# Activar este modo en el backend principal:
#   SCRAPER_ISOLATION_MODE=docker
#   SCRAPER_DOCKER_IMAGE=assu-backend-scraper:latest
#
# Usa la imagen oficial de Playwright (Chromium + todas sus dependencias
# de sistema ya instaladas) en vez de armar eso a mano sobre node:slim —
# reduce drásticamente el riesgo de que el contenedor falle por una
# librería de sistema faltante que cambió entre versiones de Chromium.
FROM mcr.microsoft.com/playwright:v1.47.0-jammy AS build

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY prisma ./prisma
COPY tsconfig*.json ./
COPY src ./src
RUN pnpm run build

FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Nunca corras esto como root en un host compartido — el usuario `pwuser`
# ya viene creado en la imagen base de Playwright con los permisos
# correctos para lanzar Chromium sin --no-sandbox.
USER pwuser

# stdin abierto (-i en `docker run`) es cómo entra el job; nada de red
# expuesta, nada de puertos — este contenedor no escucha nada.
ENTRYPOINT ["node", "dist/scraper-worker/entrypoint.js"]
