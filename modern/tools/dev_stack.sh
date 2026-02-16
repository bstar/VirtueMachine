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
DEV_WEB_SERVER="${DEV_WEB_SERVER:-vite}"
BUN_TMPDIR="${BUN_TMPDIR:-$ROOT_DIR/.tmp-bun}"
VM_NET_HOST="${VM_NET_HOST:-127.0.0.1}"
VM_NET_PORT="${VM_NET_PORT:-8081}"
VM_NET_DATA_DIR="${VM_NET_DATA_DIR:-$ROOT_DIR/modern/net/data}"
VM_NET_RUNTIME_DIR="${VM_NET_RUNTIME_DIR:-}"
VM_NET_OBJECT_BASELINE_DIR="${VM_NET_OBJECT_BASELINE_DIR:-$ROOT_DIR/modern/assets/pristine/savegame}"
VM_SIM_CORE_INTERACT_BIN="${VM_SIM_CORE_INTERACT_BIN:-$ROOT_DIR/build/modern/sim-core/sim_core_world_interact_bridge}"
VM_SIM_CORE_INTERACT_REQUIRED="${VM_SIM_CORE_INTERACT_REQUIRED:-on}"
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

if [[ -z "$VM_NET_RUNTIME_DIR" ]]; then
  # Prefer pristine external runtime dir when present.
  if [[ -d "$ROOT_DIR/../ultima6/savegame" ]]; then
    VM_NET_RUNTIME_DIR="$ROOT_DIR/../ultima6"
  else
    VM_NET_RUNTIME_DIR="$ROOT_DIR/modern/assets/runtime"
  fi
fi

collect_listener_pids() {
  local port="$1"
  if [[ -z "$port" ]]; then
    return 0
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
    return 0
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null \
      | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
      | sort -u
    return 0
  fi
}

kill_listener_port() {
  local port="$1"
  local pids
  pids="$(collect_listener_pids "$port" | tr '\n' ' ' | xargs -r echo || true)"
  if [[ -z "${pids:-}" ]]; then
    return 0
  fi
  echo "Stopping existing listeners on :$port -> $pids"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 0.2
  # shellcheck disable=SC2086
  kill -9 $pids 2>/dev/null || true
}

kill_listener_port "$DEV_WEB_PORT"
kill_listener_port "$VM_NET_PORT"

cleanup() {
  local code=$?
  if [[ -n "${WEB_PID:-}" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    pkill -P "$WEB_PID" 2>/dev/null || true
    kill "$WEB_PID" 2>/dev/null || true
  fi
  if [[ -n "${NET_PID:-}" ]] && kill -0 "$NET_PID" 2>/dev/null; then
    pkill -P "$NET_PID" 2>/dev/null || true
    kill "$NET_PID" 2>/dev/null || true
  fi
  pkill -f "bunx --bun vite --config $ROOT_DIR/vite.config.mjs" 2>/dev/null || true
  pkill -f "bun $ROOT_DIR/modern/net/server.ts" 2>/dev/null || true
  wait 2>/dev/null || true
  exit "$code"
}
trap cleanup INT TERM EXIT

cd "$ROOT_DIR"

if [[ ! -x "$VM_SIM_CORE_INTERACT_BIN" ]]; then
  cmake -S "$ROOT_DIR" -B "${U6M_BUILD_DIR:-$ROOT_DIR/build}" -G Ninja >/dev/null
  cmake --build "${U6M_BUILD_DIR:-$ROOT_DIR/build}" --target sim_core_world_interact_bridge >/dev/null
fi

if [[ "$DEV_WEB_SERVER" == "vite" ]]; then
  if ! command -v bun >/dev/null 2>&1; then
    echo "DEV_WEB_SERVER=vite requires bun in PATH. Set DEV_WEB_SERVER=secure to use secure_web_server." >&2
    exit 1
  fi
  mkdir -p "$BUN_TMPDIR"
  bash -lc "cd '$ROOT_DIR' && TMPDIR='$BUN_TMPDIR' bunx --bun vite --config '$ROOT_DIR/vite.config.mjs' --host '$DEV_WEB_BIND' --port '$DEV_WEB_PORT' --strictPort --clearScreen false 2>&1 | tee '$WEB_LOG' | sed 's/^/[web] /'" &
  WEB_PID=$!
else
  bash -lc "cd '$ROOT_DIR' && python3 '$ROOT_DIR/modern/tools/secure_web_server.py' --root '$ROOT_DIR' --bind '$DEV_WEB_BIND' --port '$DEV_WEB_PORT' 2>&1 | tee '$WEB_LOG' | sed 's/^/[web] /'" &
  WEB_PID=$!
fi

VM_NET_HOST="$VM_NET_HOST" VM_NET_PORT="$VM_NET_PORT" VM_NET_DATA_DIR="$VM_NET_DATA_DIR" VM_NET_RUNTIME_DIR="$VM_NET_RUNTIME_DIR" VM_NET_OBJECT_BASELINE_DIR="$VM_NET_OBJECT_BASELINE_DIR" \
VM_SIM_CORE_INTERACT_BIN="$VM_SIM_CORE_INTERACT_BIN" VM_SIM_CORE_INTERACT_REQUIRED="$VM_SIM_CORE_INTERACT_REQUIRED" \
VM_EMAIL_MODE="$VM_EMAIL_MODE" VM_EMAIL_FROM="$VM_EMAIL_FROM" \
VM_EMAIL_SMTP_HOST="$VM_EMAIL_SMTP_HOST" VM_EMAIL_SMTP_PORT="$VM_EMAIL_SMTP_PORT" VM_EMAIL_SMTP_SECURE="$VM_EMAIL_SMTP_SECURE" \
VM_EMAIL_SMTP_USER="$VM_EMAIL_SMTP_USER" VM_EMAIL_SMTP_PASS="$VM_EMAIL_SMTP_PASS" \
VM_EMAIL_RESEND_API_KEY="$VM_EMAIL_RESEND_API_KEY" VM_EMAIL_RESEND_BASE_URL="$VM_EMAIL_RESEND_BASE_URL" \
  bun "$ROOT_DIR/modern/net/server.ts" \
  2>&1 | tee "$NET_LOG" | sed 's/^/[net] /' &
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
Web client: http://${DEV_WEB_BIND}:${DEV_WEB_PORT}/modern/client-web/index.html (${DEV_WEB_SERVER})
Net API:    http://${VM_NET_HOST}:${VM_NET_PORT}/health
Runtime:    ${VM_NET_RUNTIME_DIR}
Baseline:   ${VM_NET_OBJECT_BASELINE_DIR}
Interact:   ${VM_SIM_CORE_INTERACT_BIN} (required=${VM_SIM_CORE_INTERACT_REQUIRED})
Email:      mode=${VM_EMAIL_MODE} smtp=${VM_EMAIL_SMTP_HOST}:${VM_EMAIL_SMTP_PORT} secure=${VM_EMAIL_SMTP_SECURE}
            resend=${VM_EMAIL_RESEND_BASE_URL} key=$([[ -n "${VM_EMAIL_RESEND_API_KEY}" ]] && echo set || echo missing)
Logs:
  web -> $WEB_LOG
  net -> $NET_LOG

Press Ctrl+C to stop both services.
EOF

wait -n "$WEB_PID" "$NET_PID"
