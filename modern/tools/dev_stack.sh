#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${VM_DEV_ENV_FILE:-$ROOT_DIR/.env.local}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "$ENV_FILE"
  set +a
fi

DEV_WEB_BIND="${DEV_WEB_BIND:-0.0.0.0}"
DEV_WEB_PORT="${DEV_WEB_PORT:-8080}"
VM_NET_HOST="${VM_NET_HOST:-127.0.0.1}"
VM_NET_PORT="${VM_NET_PORT:-8081}"
VM_NET_DATA_DIR="${VM_NET_DATA_DIR:-$ROOT_DIR/modern/net/data}"
VM_EMAIL_MODE="${VM_EMAIL_MODE:-resend}"
VM_EMAIL_FROM="${VM_EMAIL_FROM:-no-reply@virtuemachine.local}"
VM_EMAIL_SMTP_HOST="${VM_EMAIL_SMTP_HOST:-127.0.0.1}"
VM_EMAIL_SMTP_PORT="${VM_EMAIL_SMTP_PORT:-25}"
VM_EMAIL_SMTP_SECURE="${VM_EMAIL_SMTP_SECURE:-off}"
VM_EMAIL_SMTP_USER="${VM_EMAIL_SMTP_USER:-}"
VM_EMAIL_SMTP_PASS="${VM_EMAIL_SMTP_PASS:-}"
VM_EMAIL_RESEND_API_KEY="${VM_EMAIL_RESEND_API_KEY:-}"
VM_EMAIL_RESEND_BASE_URL="${VM_EMAIL_RESEND_BASE_URL:-https://api.resend.com/emails}"

WEB_LOG="${DEV_WEB_LOG:-$ROOT_DIR/.tmp-dev-web.log}"
NET_LOG="${DEV_NET_LOG:-$ROOT_DIR/.tmp-dev-net.log}"

mkdir -p "$VM_NET_DATA_DIR"

cleanup() {
  local code=$?
  if [[ -n "${WEB_PID:-}" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
  if [[ -n "${NET_PID:-}" ]] && kill -0 "$NET_PID" 2>/dev/null; then
    kill "$NET_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "$code"
}
trap cleanup INT TERM EXIT

cd "$ROOT_DIR"

python3 "$ROOT_DIR/modern/tools/secure_web_server.py" \
  --root "$ROOT_DIR" \
  --bind "$DEV_WEB_BIND" \
  --port "$DEV_WEB_PORT" \
  >"$WEB_LOG" 2>&1 &
WEB_PID=$!

VM_NET_HOST="$VM_NET_HOST" VM_NET_PORT="$VM_NET_PORT" VM_NET_DATA_DIR="$VM_NET_DATA_DIR" \
VM_EMAIL_MODE="$VM_EMAIL_MODE" VM_EMAIL_FROM="$VM_EMAIL_FROM" \
VM_EMAIL_SMTP_HOST="$VM_EMAIL_SMTP_HOST" VM_EMAIL_SMTP_PORT="$VM_EMAIL_SMTP_PORT" VM_EMAIL_SMTP_SECURE="$VM_EMAIL_SMTP_SECURE" \
VM_EMAIL_SMTP_USER="$VM_EMAIL_SMTP_USER" VM_EMAIL_SMTP_PASS="$VM_EMAIL_SMTP_PASS" \
VM_EMAIL_RESEND_API_KEY="$VM_EMAIL_RESEND_API_KEY" VM_EMAIL_RESEND_BASE_URL="$VM_EMAIL_RESEND_BASE_URL" \
  node "$ROOT_DIR/modern/net/server.js" \
  >"$NET_LOG" 2>&1 &
NET_PID=$!

sleep 0.3
if ! kill -0 "$WEB_PID" 2>/dev/null; then
  echo "Web server failed. Log: $WEB_LOG" >&2
  cat "$WEB_LOG" >&2 || true
  exit 1
fi
if ! kill -0 "$NET_PID" 2>/dev/null; then
  echo "Net server failed. Log: $NET_LOG" >&2
  cat "$NET_LOG" >&2 || true
  exit 1
fi

cat <<EOF
VirtueMachine dev stack is up.
Web client: http://${DEV_WEB_BIND}:${DEV_WEB_PORT}/modern/client-web/
Net API:    http://${VM_NET_HOST}:${VM_NET_PORT}/health
Email:      mode=${VM_EMAIL_MODE} smtp=${VM_EMAIL_SMTP_HOST}:${VM_EMAIL_SMTP_PORT} secure=${VM_EMAIL_SMTP_SECURE}
            resend=${VM_EMAIL_RESEND_BASE_URL} key=$([[ -n "${VM_EMAIL_RESEND_API_KEY}" ]] && echo set || echo missing)
Logs:
  web -> $WEB_LOG
  net -> $NET_LOG

Press Ctrl+C to stop both services.
EOF

wait -n "$WEB_PID" "$NET_PID"
