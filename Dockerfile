# syntax=docker/dockerfile:1.4
# Stage: builder
FROM node:20-bullseye-slim AS builder

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

# Rebuild sqlite3 in its own layer so the native build can be cached independently
# (parallelized with MAKEFLAGS and using the node-gyp cache).
RUN --mount=type=cache,id=npm,target=/root/.npm \
    --mount=type=cache,id=node-gyp,target=/root/.cache/node-gyp \
    MAKEFLAGS="-j$(nproc)" npm rebuild sqlite3 --build-from-source

# Install frontend deps (cached separately)
RUN --mount=type=cache,target=/root/.npm \
    if [ -f apps/web/package.json ]; then npm --prefix apps/web ci --no-audit --no-fund --ignore-scripts; fi

# Copy the rest of the source
COPY . .

# Build backend and prune dev deps. If the Next.js app was prebuilt in CI
# (i.e. `apps/web/.next` exists in the build context) skip the expensive
# Next.js build and only run TypeScript compilation for the server.
RUN if [ -d apps/web/.next ]; then \
      echo "Found prebuilt apps/web/.next — skipping Next.js build"; \
      ./node_modules/.bin/tsc; \
    else \
      npm run build; \
    fi && npm prune --production

# Stage: runtime
FROM node:20-bullseye-slim
ENV NODE_ENV=production
WORKDIR /home/node/app

# Copy built app from builder
COPY --from=builder /app ./

# Create a non-root user and fix perms
RUN addgroup --system app && adduser --system --ingroup app app && chown -R app:app /home/node/app

# Copy entrypoint and set permissions
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER app
VOLUME ["/home/node/app/data"]
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
