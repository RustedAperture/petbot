# Development Dockerfile (now the default runtime for the project)
# This image runs both the bot and web in development mode by default
FROM node:20-bullseye-slim

WORKDIR /home/node/app

# Install build deps for native modules (sqlite3) and other tooling
RUN apt-get update && \
    apt-get install -y build-essential python3 libsqlite3-dev --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy root and web package manifests and install all deps (including devDeps)
COPY package*.json ./
COPY package-lock.json ./
COPY web/package*.json web/
COPY web/package-lock.json web/

RUN npm ci --no-audit --no-fund
RUN cd web && npm ci --no-audit --no-fund

# Copy project files
COPY . .

# Ensure files owned by non-root user
RUN addgroup --system app && adduser --system --ingroup app app && chown -R app:app /home/node/app

# Copy entrypoint and make executable
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER app
VOLUME ["/home/node/app/data"]
EXPOSE 3000 3030
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/sh", "-c", "npm run dev"]
