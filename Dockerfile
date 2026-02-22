# syntax=docker/dockerfile:1.4
# Stage: builder
FROM node:24-bullseye-slim AS builder

WORKDIR /app

# Keep npm global prefix consistent with your Unraid snippet
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=/home/node/.npm-global/bin:${PATH}

# Copy package manifests early so dependency layers are cached separately.
COPY package*.json ./
COPY apps/web/package*.json apps/web/

# Install build deps for native modules (sqlite3). Add `python-is-python3` and `pkg-config` so node-gyp works reliably
RUN apt-get update && \
    apt-get install -y build-essential python3 python-is-python3 pkg-config libsqlite3-dev --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install root dependencies (using BuildKit cache mounts when available).
# Rebuild `sqlite3` only when cross-building (BUILDPLATFORM != TARGETPLATFORM) so same-arch builds can use prebuilt binaries.
ARG FORCE_SQLITE_REBUILD=false

# Cache mounts have stable ids so BuildKit/GHA can persist them across runs.
RUN --mount=type=cache,id=npm,target=/root/.npm \
    --mount=type=cache,id=node-gyp,target=/root/.cache/node-gyp \
    npm ci --no-audit --no-fund --ignore-scripts

# Copy the rest of the source (server build only in this stage)
COPY . .

# Build backend and prune dev deps. The web app is now built in a separate
# `web-builder` stage so `bot`/server-only builds do not run Next.js.
RUN ./node_modules/.bin/tsc && npm prune --production


# Web builder — builds only the Next.js app and its web dependencies so
# `bot` builds are not affected by the expensive frontend build.
FROM node:24-bullseye-slim AS web-builder
WORKDIR /app

# Install only web dependencies (cached). This keeps web build isolated.
COPY apps/web/package*.json ./apps/web/

# Make root package.json available to the web build (some client code imports it)
COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm npm --prefix apps/web ci --no-audit --no-fund --ignore-scripts

# Copy web sources and build
COPY apps/web ./apps/web
RUN npm --prefix apps/web run build



# --- Split targets ---------------------------------------------------------
# Bot-only runtime (server only)
FROM node:24-bullseye-slim AS bot
ENV NODE_ENV=production
WORKDIR /home/node/app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY entrypoint-bot.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
RUN addgroup --system app && adduser --system --ingroup app app && chown -R app:app /home/node/app
USER app
VOLUME ["/home/node/app/data"]
EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/src/index.js"]

# Web-only runtime (Next.js only)
FROM node:24-bullseye-slim AS web
ENV NODE_ENV=production
WORKDIR /home/node/app

# Web needs its own node_modules and the built .next output — copy from web-builder
COPY --from=web-builder /app/apps/web/.next ./apps/web/.next
COPY --from=web-builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=web-builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=web-builder /app/apps/web/public ./apps/web/public
COPY changelog.md ./changelog.md

RUN addgroup --system app && adduser --system --ingroup app app && chown -R app:app /home/node/app
USER app
EXPOSE 3000
WORKDIR /home/node/app/apps/web
CMD ["npm", "run", "start"]
