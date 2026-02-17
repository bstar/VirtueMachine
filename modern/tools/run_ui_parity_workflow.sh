#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:---verify}"

if [[ "$MODE" != "--verify" && "$MODE" != "--write" ]]; then
  echo "Usage: $0 [--verify|--write]" >&2
  exit 2
fi

echo "[1/9] Legacy UI anchor guard..."
"$ROOT_DIR/modern/tools/test_legacy_ui_anchors.sh"

echo "[2/9] UI probe contract tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"

echo "[3/9] Inventory/Paperdoll layout regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_inventory_paperdoll.sh"

echo "[4/9] Paperdoll equipment occupancy regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_paperdoll_equipment.sh"

echo "[5/9] Party harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_party_message.sh"

echo "[6/9] Message log harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_message_log.sh"

echo "[7/9] Panel scope classification regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_panel_scope.sh"

echo "[8/9] Deterministic sample fixture check..."
bun "$ROOT_DIR/modern/tools/generate_ui_probe_fixture.ts" "$MODE"

echo "[9/9] Workflow complete."
if [[ "$MODE" == "--write" ]]; then
  echo "Updated fixture: modern/client-web/tests/fixtures/ui_probe.sample.json"
fi
