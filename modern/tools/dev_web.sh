#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${DEV_WEB_PORT:-8080}"
BIND="${DEV_WEB_BIND:-0.0.0.0}"
SERVER_MODE="${DEV_WEB_SERVER:-vite}"
BUN_TMPDIR="${BUN_TMPDIR:-$ROOT_DIR/.tmp-bun}"

cd "$ROOT_DIR"
if [[ "$SERVER_MODE" == "vite" ]]; then
  if ! command -v bun >/dev/null 2>&1; then
    echo "DEV_WEB_SERVER=vite requires bun in PATH. Set DEV_WEB_SERVER=secure to use secure_web_server." >&2
    exit 1
  fi
  mkdir -p "$BUN_TMPDIR"
  echo "Serving VirtueMachine web client (Vite HMR) at http://${BIND}:${PORT}/modern/client-web/index.html"
  exec env TMPDIR="$BUN_TMPDIR" bunx --bun vite --config "$ROOT_DIR/vite.config.ts" --host "$BIND" --port "$PORT" --strictPort
fi

echo "Serving VirtueMachine web client (secure_web_server) at http://${BIND}:${PORT}/modern/client-web/"
echo "Path allowlist: /modern/client-web/*, /modern/assets/runtime/*, /modern/assets/pristine/*, /modern/*, /legacy/u6-decompiled/SRC/*, /docs/wiki/*"
exec python3 "$ROOT_DIR/modern/tools/secure_web_server.py" \
  --root "$ROOT_DIR" \
  --bind "$BIND" \
  --port "$PORT"
