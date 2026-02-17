#!/bin/sh
set -e

# Ensure data directory exists and is writeable by the app user
if [ -d "/home/node/app/data" ]; then
  chown -R app:app /home/node/app/data || true
fi

# Run deploy commands (register/update slash commands) before starting the bot
# This ensures the up-to-date commands are deployed at container start.
if [ -f "/home/node/app/dist/src/deploy-commands.js" ]; then
  echo "[INFO] Running deploy-commands..."
  node /home/node/app/dist/src/deploy-commands.js || echo "[WARN] deploy-commands failed — continuing to start bot"
else
  echo "[INFO] deploy-commands not present in container; skipping"
fi

# Exec the container CMD (start the bot server)
exec "$@"
