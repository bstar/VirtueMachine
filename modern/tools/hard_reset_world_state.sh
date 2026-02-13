#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE_NAME="${1:-lb-bedroom-test}"
API_BASE="${2:-http://127.0.0.1:8081}"
USER_NAME="${3:-avatar}"
USER_PASS="${4:-boob}"

cd "$ROOT_DIR"

echo "[1/5] Stopping running local servers (if any)..."
pkill -f "modern/net/server.js" >/dev/null 2>&1 || true
pkill -f "modern/tools/secure_web_server.py" >/dev/null 2>&1 || true

echo "[2/5] Activating pristine baseline profile: $PROFILE_NAME"
./modern/tools/activate_baseline_profile.sh "$PROFILE_NAME"

echo "[3/5] Clearing persisted world object deltas..."
rm -f "$ROOT_DIR/modern/net/data/world_object_deltas.json"

echo "[4/5] Starting dev stack..."
./modern/tools/dev_stack.sh >/tmp/virtuemachine_dev_stack.log 2>&1 &
STACK_PID=$!
sleep 2
if ! kill -0 "$STACK_PID" >/dev/null 2>&1; then
  echo "Failed to start dev stack. See /tmp/virtuemachine_dev_stack.log"
  exit 1
fi

echo "[5/5] Reloading server baseline..."
node "$ROOT_DIR/modern/tools/reload_net_baseline.js" \
  --api "$API_BASE" \
  --user "$USER_NAME" \
  --pass "$USER_PASS"

echo
echo "Hard reset complete."
echo "If browser still shows stale state, hard refresh (Ctrl+Shift+R)."
