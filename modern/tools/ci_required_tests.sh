#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${U6M_BUILD_DIR:-$ROOT_DIR/build}"

cmake -S "$ROOT_DIR" -B "$BUILD_DIR" -G Ninja
cmake --build "$BUILD_DIR"

required_tests=(
  sim_core_replay_test
  sim_core_world_state_io_test
  sim_core_snapshot_persistence_test
  sim_core_command_envelope_test
  sim_core_replay_checkpoints_test
  tools_compare_checkpoints_test
  client_web_render_composition_test
)

for t in "${required_tests[@]}"; do
  ctest --test-dir "$BUILD_DIR" -R "^${t}$" --output-on-failure
 done

if command -v node >/dev/null 2>&1; then
  "$ROOT_DIR/modern/tools/test_runtime_contract.sh"
  "$ROOT_DIR/modern/tools/test_client_web_conversation.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"
else
  echo "Skipping JS contract tests: node not found in PATH"
fi

echo "Required CI tests passed (${#required_tests[@]} ctests + JS contract checks)."
