#!/bin/sh
set -e

# Ensure data directory exists and is writeable by the app user
if [ -d "/home/node/app/data" ]; then
  chown -R app:app /home/node/app/data || true
fi

# If config is mounted as a file check it exists, otherwise warn
if [ ! -f "/home/node/app/config.json" ]; then
  echo "[WARN] /home/node/app/config.json not found — make sure to mount your config or set required env vars."
fi

# Run deploy commands (register/update slash commands) before starting the bot
# This ensures the up-to-date commands are deployed at container start.
if [ -f "/home/node/app/dist/src/deploy-commands.js" ]; then
  echo "[INFO] Running deploy-commands..."
  node /home/node/app/dist/src/deploy-commands.js || echo "[WARN] deploy-commands failed — continuing to start bot"
else
  echo "[INFO] deploy-commands not present in container; skipping"
fi

# If we have a built Next app, start it in the background so the container serves both UI + bot
if [ -d "/home/node/app/apps/web/.next" ]; then
  echo "[INFO] Starting Next.js server (apps/web)..."
  (cd /home/node/app/apps/web && npm run start --silent) &
fi

exec "$@"
