#!/usr/bin/env sh
set -eu

run_migrations="${RUN_MIGRATIONS:-1}"
case "$run_migrations" in
  0|false|FALSE|no|NO)
    echo "==> Skipping database migrations (RUN_MIGRATIONS=$run_migrations)"
    ;;
  *)
    echo "==> Running database migrations..."
    python -m alembic -c /app/backend/alembic.ini upgrade head
    ;;
esac

host="${UVICORN_HOST:-0.0.0.0}"
port="${UVICORN_PORT:-8787}"
log_level="${UVICORN_LOG_LEVEL:-info}"
workers="${UVICORN_WORKERS:-1}"

echo "==> Starting Uvicorn on ${host}:${port} (workers=${workers})..."
exec python -m uvicorn backend.app.main:app \
  --host "$host" \
  --port "$port" \
  --log-level "$log_level" \
  --proxy-headers \
  --forwarded-allow-ips="*" \
  --workers "$workers"
