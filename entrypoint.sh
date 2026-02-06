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

exec "$@"
