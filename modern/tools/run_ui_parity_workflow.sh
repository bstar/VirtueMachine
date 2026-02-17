#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:---verify}"

if [[ "$MODE" != "--verify" && "$MODE" != "--write" ]]; then
  echo "Usage: $0 [--verify|--write]" >&2
  exit 2
fi

echo "[1/4] Legacy UI anchor guard..."
"$ROOT_DIR/modern/tools/test_legacy_ui_anchors.sh"

echo "[2/4] UI probe contract tests..."
"$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"

echo "[3/4] Deterministic sample fixture check..."
bun "$ROOT_DIR/modern/tools/generate_ui_probe_fixture.ts" "$MODE"

echo "[4/4] Workflow complete."
if [[ "$MODE" == "--write" ]]; then
  echo "Updated fixture: modern/client-web/tests/fixtures/ui_probe.sample.json"
fi
