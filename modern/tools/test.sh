#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${U6M_BUILD_DIR:-$ROOT_DIR/build}"

if [[ "${1:-}" == "--clean" ]]; then
  rm -rf "$BUILD_DIR"
fi

cmake -S "$ROOT_DIR" -B "$BUILD_DIR" -G Ninja
cmake --build "$BUILD_DIR"
ctest --test-dir "$BUILD_DIR" --output-on-failure

if command -v bun >/dev/null 2>&1; then
  "$ROOT_DIR/modern/tools/test_runtime_contract.sh"
  "$ROOT_DIR/modern/tools/test_legacy_ui_anchors.sh"
  "$ROOT_DIR/modern/tools/test_client_web_conversation.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_inventory_paperdoll.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_probe_fixture.sh"
else
  echo "Skipping Bun contract tests: bun not found in PATH"
fi
