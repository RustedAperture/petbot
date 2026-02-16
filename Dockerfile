# Stage: builder
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Keep npm global prefix consistent with your Unraid snippet
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=/home/node/.npm-global/bin:${PATH}

# Install build deps for native modules (sqlite3)
COPY package*.json ./
RUN apt-get update && \
    apt-get install -y build-essential python3 libsqlite3-dev --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies and build
RUN npm ci --no-audit --no-fund
COPY . .
# Install frontend deps (if present). The root `npm run build` will perform the actual build
RUN if [ -d "apps/web" ]; then \
  cd apps/web && npm ci --no-audit --no-fund; \
fi

# Build backend and prune dev deps
RUN npm run build && npm prune --production

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
