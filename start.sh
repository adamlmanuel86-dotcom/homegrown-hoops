#!/bin/sh
set -e

echo "[start] Running database migration..."
timeout 90 pnpm --filter @workspace/db run push-force
echo "[start] Migration complete. Starting API server..."
exec pnpm --filter @workspace/api-server run start
