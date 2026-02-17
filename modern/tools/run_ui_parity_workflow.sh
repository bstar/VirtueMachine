#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:---verify}"

if [[ "$MODE" != "--verify" && "$MODE" != "--write" ]]; then
  echo "Usage: $0 [--verify|--write]" >&2
  exit 2
fi

echo "[1/11] Legacy UI anchor guard..."
"$ROOT_DIR/modern/tools/test_legacy_ui_anchors.sh"

echo "[2/11] UI probe contract tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"

echo "[3/11] Inventory/Paperdoll layout regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_inventory_paperdoll.sh"

echo "[4/11] Paperdoll equipment occupancy regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_paperdoll_equipment.sh"

echo "[5/11] Party harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_party_message.sh"

echo "[6/11] Message log harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_message_log.sh"

echo "[7/11] Panel scope classification regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_panel_scope.sh"

echo "[8/11] Target resolver harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_target_resolver.sh"

echo "[9/11] Mechanics capability harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_mechanics_capability.sh"

echo "[10/11] Deterministic sample fixture check..."
bun "$ROOT_DIR/modern/tools/generate_ui_probe_fixture.ts" "$MODE"

echo "[11/11] Workflow complete."
if [[ "$MODE" == "--write" ]]; then
  echo "Updated fixture: modern/client-web/tests/fixtures/ui_probe.sample.json"
fi
