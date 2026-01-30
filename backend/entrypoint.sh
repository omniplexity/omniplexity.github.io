#!/usr/bin/env sh
set -eu

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}${HEALTH_PATH}}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-10}"
HEALTH_RETRIES="${HEALTH_RETRIES:-3}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-3}"
HEALTH_START_PERIOD_SECONDS="${HEALTH_START_PERIOD_SECONDS:-15}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"

mkdir -p /app/data /app/logs

if [ "$RUN_MIGRATIONS" != "false" ]; then
  echo "Running migrations..."
  alembic upgrade head
fi

uvicorn app.main:app --host "$HOST" --port "$PORT" &
app_pid=$!

term_handler() {
  echo "Stopping OmniAI backend..."
  kill -TERM "$app_pid" 2>/dev/null || true
  wait "$app_pid" 2>/dev/null || true
  exit 0
}

trap term_handler TERM INT

if [ "$HEALTH_START_PERIOD_SECONDS" -gt 0 ] 2>/dev/null; then
  i=0
  while [ "$i" -lt "$HEALTH_START_PERIOD_SECONDS" ]; do
    if ! kill -0 "$app_pid" 2>/dev/null; then
      wait "$app_pid" 2>/dev/null || true
      exit 1
    fi
    i=$((i + 1))
    sleep 1
  done
fi

fail_count=0
while kill -0 "$app_pid" 2>/dev/null; do
  if curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "$HEALTH_URL" >/dev/null 2>&1; then
    fail_count=0
  else
    fail_count=$((fail_count + 1))
    echo "Healthcheck failed (${fail_count}/${HEALTH_RETRIES})"
    if [ "$fail_count" -ge "$HEALTH_RETRIES" ]; then
      echo "Healthcheck failed too many times. Exiting."
      kill -TERM "$app_pid" 2>/dev/null || true
      wait "$app_pid" 2>/dev/null || true
      exit 1
    fi
  fi
  sleep "$HEALTH_INTERVAL_SECONDS"
done

wait "$app_pid"
