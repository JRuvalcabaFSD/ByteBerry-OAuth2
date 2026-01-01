# ============================================================================
# Stage 1: Dependencies (Base con pnpm)
# ============================================================================
FROM node:22-alpine AS deps

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copiar solo archivos de dependencias
COPY package.json pnpm-lock.yaml ./
# TODO F2
# COPY prisma ./prisma/

# Instalar SOLO dependencias de producción
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
	pnpm config set store-dir /pnpm/store && \
	pnpm install --prod --no-frozen-lockfile


# ============================================================================
# Stage 2: Builder (Compilación TypeScript)
# ============================================================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
RUN apk add --no-cache jq dos2unix

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar TODAS las dependencias
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
	pnpm config set store-dir /pnpm/store && \
	pnpm install --no-frozen-lockfile


# TODO F2
# Copiar Prisma schema y config para generar cliente
# COPY prisma ./prisma/
# COPY prisma.config.ts ./

COPY tsconfig*.json ./
COPY src ./src
COPY scripts ./scripts
# TODO F1
# COPY --chown=root:root public/ ./public/
# COPY views ./views


# DATABASE_URL dummy para Prisma generate
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# TODO F2
# Generar Prisma Client
# RUN pnpm prisma generate

# ARG VERSION inyectado desde GitHub Actions
ARG VERSION=dev
ENV APP_VERSION=${VERSION}

# Script para actualizar version en package.json
# Inyecta versión
COPY scripts/update-version.sh /tmp/update-version.sh
RUN dos2unix /tmp/update-version.sh && \
	chmod +x /tmp/update-version.sh && \
	/tmp/update-version.sh "${APP_VERSION}"

# Compilar TypeScript
RUN pnpm build

# ============================================================================
# Stage 3: Runtime (Imagen Final Mínima)
# ============================================================================
FROM node:22-alpine AS runtime

# ARG VERSION inyectado desde GitHub Actions
ARG VERSION=dev
ENV APP_VERSION=${VERSION}

# Instalar dependencias runtime necesarias
# - dumb-init: manejo correcto de señales
# - openssl: generación de llaves JWT en development
# - netcat-openbsd: para wait-for-db (nc command)
RUN apk add --no-cache dumb-init openssl netcat-openbsd

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
	adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Crear directorio para llaves JWT con permisos correctos
RUN mkdir -p /app/keys && chown -R nodejs:nodejs /app/keys

# Cambiar ownership a usuario nodejs
RUN chown -R nodejs:nodejs /app

# Copiar node_modules de producción desde stage deps
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# TODO F2
# Copiar Prisma generado
# COPY --from=builder --chown=nodejs:nodejs /app/generated ./generated

# Copiar código compilado desde builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copiar package.json actualizado con versión desde builder
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# TODO F2
# Copiar archivos necesarios para runtime (migraciones)
# COPY --chown=nodejs:nodejs prisma ./prisma/
# COPY prisma.config.ts ./

# Copiar scripts necesarios
# TODO F1
# COPY --chown=nodejs:nodejs scripts/docker-entrypoint.sh ./scripts/
# COPY --chown=nodejs:nodejs scripts/generate-keys.mjs ./scripts/
COPY --chown=nodejs:nodejs scripts/healthCheck.cjs ./scripts/

# Hacer scripts ejecutables
RUN chmod +x scripts/healthCheck.cjs
# TODO F1
# chmod +x scripts/docker-entrypoint.sh && \
# RUN chmod +x scripts/generate-keys.mjs

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
	CMD ["node", "scripts/healthCheck.cjs"]

# TODO F1
# Entry point
# ENTRYPOINT ["/usr/bin/dumb-init", "--", "./scripts/docker-entrypoint.sh"]


# Variables de entorno por defecto
ENV NODE_ENV=production \
	PORT=4000

# Comando de inicio
CMD ["node", "dist/src/app.js"]

# Metadata labels
LABEL maintainer="JRuvalcabaFSD <support@jrmdev.org>"
LABEL description="ByteBerry OAuth2 Service - JWT Auth with Auto Key Management"
LABEL version="${APP_VERSION}"
LABEL org.opencontainers.image.title="ByteBerry OAuth2 Service"
LABEL org.opencontainers.image.description="OAuth2 authentication with Clean Architecture and JWT key auto-management"
LABEL org.opencontainers.image.vendor="JRuvalcabaFSD"
LABEL org.opencontainers.image.version="${APP_VERSION}"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2"
LABEL org.opencontainers.image.documentation="https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2#readme"

#==============================================================================
# Usage Notes:
#
# Development (auto-generate keys):
#   docker run -e NODE_ENV=development -p 4000:4000 byteberry-oauth2:latest
#
# Production (mount keys):
#   docker run -e NODE_ENV=production \
#              -v /path/to/keys:/app/keys:ro \
#              -p 4000:4000 \
#              byteberry-oauth2:latest
#
# OpenMediaVault (with Portainer):
#   See: OMV_JWT_KEYS_SETUP.md
#==============================================================================
