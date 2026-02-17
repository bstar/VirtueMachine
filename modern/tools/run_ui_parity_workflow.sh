#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:---verify}"

if [[ "$MODE" != "--verify" && "$MODE" != "--write" ]]; then
  echo "Usage: $0 [--verify|--write]" >&2
  exit 2
fi

echo "[1/12] Legacy UI anchor guard..."
"$ROOT_DIR/modern/tools/test_legacy_ui_anchors.sh"

echo "[2/12] UI probe contract tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"

echo "[3/12] Inventory/Paperdoll layout regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_inventory_paperdoll.sh"

echo "[4/12] Paperdoll equipment occupancy regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_paperdoll_equipment.sh"

echo "[5/12] Party harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_party_message.sh"

echo "[6/12] Message log harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_message_log.sh"

echo "[7/12] Panel scope classification regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_panel_scope.sh"

echo "[8/12] Target resolver harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_target_resolver.sh"

echo "[9/12] Mechanics capability harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_mechanics_capability.sh"

echo "[10/12] Verb capability harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_verb_capability.sh"

echo "[11/12] Deterministic sample fixture check..."
bun "$ROOT_DIR/modern/tools/generate_ui_probe_fixture.ts" "$MODE"

echo "[12/12] Workflow complete."
if [[ "$MODE" == "--write" ]]; then
  echo "Updated fixture: modern/client-web/tests/fixtures/ui_probe.sample.json"
fi
