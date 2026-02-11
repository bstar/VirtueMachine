#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${DEV_WEB_PORT:-8080}"
BIND="${DEV_WEB_BIND:-0.0.0.0}"

echo "Serving VirtueMachine web client at http://${BIND}:${PORT}/modern/client-web/"
echo "Path allowlist: /modern/client-web/* and /modern/assets/runtime/*"
cd "$ROOT_DIR"
python3 "$ROOT_DIR/modern/tools/secure_web_server.py" \
  --root "$ROOT_DIR" \
  --bind "$BIND" \
  --port "$PORT"
