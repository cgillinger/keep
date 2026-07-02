#!/bin/sh
set -e

# Bind-mounted host directories (./data, ./logs) keep the host's ownership, which
# shadows the image's chown. Fix ownership here — while still root — so the app can
# write the SQLite DB (incl. the WAL/SHM sidecar files), sessions and images
# regardless of who owns the host dirs, then drop to the unprivileged node user.
mkdir -p /app/data /app/logs
chown -R node:node /app/data /app/logs 2>/dev/null || true

exec su-exec node:node "$@"
