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

# If DEV=1 start both bot and web in dev mode (concurrently and with signal handling)
if [ "${DEV}" = "1" ] || [ "${DEV}" = "true" ]; then
  echo "[INFO] Starting in development mode: running bot and web dev servers"

  # Start bot dev script (root package.json)
  npm run dev &
  bot_pid=$!

  # Start web dev server (Next.js)
  (cd /home/node/app/web && npm run dev) &
  web_pid=$!

  shutdown() {
    echo "[INFO] Shutting down dev processes..."
    kill -TERM "$bot_pid" 2>/dev/null || true
    kill -TERM "$web_pid" 2>/dev/null || true
    wait "$bot_pid" 2>/dev/null || true
    wait "$web_pid" 2>/dev/null || true
    exit 0
  }

  trap shutdown INT TERM

  # Wait for the child processes
  wait "$bot_pid" & wait "$web_pid"
  exit 0
fi

exec "$@"
