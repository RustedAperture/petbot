# syntax=docker/dockerfile:1.4
# Stage: builder
FROM node:26-trixie-slim AS builder

WORKDIR /app

# Keep npm global prefix consistent with your Unraid snippet
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=/home/node/.npm-global/bin:${PATH}

RUN mkdir -p /home/node/.npm-global && npm install -g npm@11.16.0

# Copy package manifests early so dependency layers are cached separately.
COPY package*.json ./
COPY apps/web/package*.json apps/web/

# No compiler toolchain needed: scripts are skipped and @libsql ships prebuilt binaries.
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci --no-audit --no-fund --ignore-scripts

# Copy the rest of the source (server build only in this stage)
COPY . .

# Build backend and prune dev deps. The web app is now built in a separate
# `web-builder` stage so `bot`/server-only builds do not run Next.js.
RUN ./node_modules/.bin/tsc && npm prune --production


# Web builder — builds only the Next.js app and its web dependencies so
# `bot` builds are not affected by the expensive frontend build.
FROM node:26-trixie-slim AS web-builder
WORKDIR /app

RUN npm install -g npm@11.16.0

# Install dependencies via root lockfile (single source of truth for workspaces).
COPY apps/web/package*.json ./apps/web/

# Make root package.json available to the web build (some client code imports it)
COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --ignore-scripts

# Populate apps/web/node_modules so the web runtime stage can copy it.
# Root npm ci hoists all workspace deps; this ensures the web workspace
# has its own node_modules directory for the standalone next start.
RUN npm install --prefix apps/web --no-audit --no-fund --ignore-scripts

# Copy web sources and the shared constants the web app imports, then build
COPY apps/web ./apps/web
COPY src/types/constants.ts ./src/types/constants.ts
RUN npm --prefix apps/web run build



# --- Split targets ---------------------------------------------------------
# Bot-only runtime (server only)
FROM node:26-trixie-slim AS bot
ENV NODE_ENV=production
WORKDIR /home/node/app

RUN addgroup --system app && \
    adduser --system --ingroup app app && \
    chmod 0755 /home/node && \
    chown app:app /home/node/app

# --chown on COPY avoids a `chown -R` layer that duplicates all of node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/drizzle ./drizzle
COPY --chmod=0755 entrypoint-bot.sh /usr/local/bin/entrypoint.sh
USER app
VOLUME ["/home/node/app/data"]
EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/src/index.js"]

# Web-only runtime (Next.js only)
FROM node:26-trixie-slim AS web
ENV NODE_ENV=production
WORKDIR /home/node/app

# Web needs its own node_modules and the built .next output — copy from web-builder
RUN addgroup --system app && \
    adduser --system --ingroup app app && \
    chmod 0755 /home/node && \
    chown app:app /home/node/app

COPY --from=web-builder --chown=app:app /app/apps/web/.next ./apps/web/.next
COPY --from=web-builder --chown=app:app /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=web-builder --chown=app:app /app/apps/web/package.json ./apps/web/package.json
COPY --from=web-builder --chown=app:app /app/apps/web/public ./apps/web/public
COPY --chown=app:app changelog.md ./changelog.md
COPY --chown=app:app privacy.md ./privacy.md
COPY --chown=app:app terms.md ./terms.md
USER app
EXPOSE 3000
WORKDIR /home/node/app/apps/web
CMD ["npm", "run", "start"]
