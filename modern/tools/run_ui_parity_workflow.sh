#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:---verify}"

if [[ "$MODE" != "--verify" && "$MODE" != "--write" ]]; then
  echo "Usage: $0 [--verify|--write]" >&2
  exit 2
fi

echo "[1/13] Legacy UI anchor guard..."
"$ROOT_DIR/modern/tools/test_legacy_ui_anchors.sh"

echo "[2/13] Canonical conversation regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_conversation.sh"

echo "[3/13] UI probe contract tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"

echo "[4/13] Inventory/Paperdoll layout regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_inventory_paperdoll.sh"

echo "[5/13] Paperdoll equipment occupancy regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_paperdoll_equipment.sh"

echo "[6/13] Party harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_party_message.sh"

echo "[7/13] Message log harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_message_log.sh"

echo "[8/13] Panel scope classification regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_panel_scope.sh"

echo "[9/13] Target resolver harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_target_resolver.sh"

echo "[10/13] Mechanics capability harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_mechanics_capability.sh"

echo "[11/13] Verb capability harness regression tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_verb_capability.sh"

echo "[12/13] Deterministic sample fixture check..."
bun "$ROOT_DIR/modern/tools/generate_ui_probe_fixture.ts" "$MODE"

echo "[13/13] Workflow complete."
if [[ "$MODE" == "--write" ]]; then
  echo "Updated fixture: modern/client-web/tests/fixtures/ui_probe.sample.json"
fi
