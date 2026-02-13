#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

API_BASE="${VM_NET_API_BASE:-http://127.0.0.1:8081}"
USER_NAME="${VM_NET_USER:-avatar}"
USER_PASS="${VM_NET_PASS:-boob}"

node "$ROOT_DIR/modern/tools/report_lb_bedroom_diff.js" \
  --api "$API_BASE" \
  --user "$USER_NAME" \
  --pass "$USER_PASS" \
  "$@"
