#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

npx tsc -p "$ROOT_DIR/tsconfig.client-sim-assets.strict.json" --noEmit
bun "$ROOT_DIR/modern/client-web/tests/object_baseline_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/object_layer_runtime_test.ts"
