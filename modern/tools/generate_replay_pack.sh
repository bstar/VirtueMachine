#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${U6M_BUILD_DIR:-$ROOT_DIR/build}"
OUT_DIR="${1:-$ROOT_DIR/build/replay-pack}"

mkdir -p "$OUT_DIR"

cmake -S "$ROOT_DIR" -B "$BUILD_DIR" -G Ninja
cmake --build "$BUILD_DIR"

ctest --test-dir "$BUILD_DIR" -R '^sim_core_replay_test$|^sim_core_replay_checkpoints_test$|^tools_compare_checkpoints_test$' --output-on-failure

SIM_TEST_BIN="$BUILD_DIR/modern/sim-core/sim_core_replay_checkpoints_test"
if [[ ! -x "$SIM_TEST_BIN" ]]; then
  echo "error: missing binary $SIM_TEST_BIN" >&2
  exit 1
fi

(
  cd "$OUT_DIR"
  "$SIM_TEST_BIN"
)

if [[ ! -f "$OUT_DIR/chk_a.csv" || ! -f "$OUT_DIR/chk_b.csv" ]]; then
  echo "error: replay checkpoint csv files were not generated" >&2
  exit 1
fi

"$ROOT_DIR/modern/tools/compare_checkpoints.sh" "$OUT_DIR/chk_a.csv" "$OUT_DIR/chk_b.csv" > "$OUT_DIR/compare.txt"

{
  echo "commit=$(git -C "$ROOT_DIR" rev-parse HEAD)"
  echo "generated_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "build_dir=$BUILD_DIR"
} > "$OUT_DIR/metadata.txt"

echo "Replay pack generated at: $OUT_DIR"
