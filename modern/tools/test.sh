#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${U6M_BUILD_DIR:-$ROOT_DIR/build}"

if [[ "${1:-}" == "--clean" ]]; then
  rm -rf "$BUILD_DIR"
fi

configure_cmake() {
  if [[ -f "$BUILD_DIR/CMakeCache.txt" ]]; then
    if cmake -S "$ROOT_DIR" -B "$BUILD_DIR"; then
      return 0
    fi
    echo "Existing CMake cache is invalid for this environment; recreating build dir..."
    rm -rf "$BUILD_DIR"
  fi

  if [[ -n "${U6M_CMAKE_GENERATOR:-}" ]]; then
    cmake -S "$ROOT_DIR" -B "$BUILD_DIR" -G "$U6M_CMAKE_GENERATOR"
    return 0
  fi

  if command -v ninja >/dev/null 2>&1; then
    cmake -S "$ROOT_DIR" -B "$BUILD_DIR" -G Ninja
    return 0
  fi

  cmake -S "$ROOT_DIR" -B "$BUILD_DIR"
}

configure_cmake
cmake --build "$BUILD_DIR"
ctest --test-dir "$BUILD_DIR" --output-on-failure

if command -v bun >/dev/null 2>&1; then
  "$ROOT_DIR/modern/tools/test_net_contracts.sh"
  "$ROOT_DIR/modern/tools/test_runtime_contract.sh"
  "$ROOT_DIR/modern/tools/test_legacy_ui_anchors.sh"
  "$ROOT_DIR/modern/tools/test_client_web_conversation.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_inventory_paperdoll.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_paperdoll_equipment.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_party_message.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_message_log.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_panel_scope.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_target_resolver.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_mechanics_capability.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_verb_capability.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_probe_fixture.sh"
else
  echo "Skipping Bun contract tests: bun not found in PATH"
fi
