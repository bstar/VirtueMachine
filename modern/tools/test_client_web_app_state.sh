#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

npx tsc -p "$ROOT_DIR/tsconfig.client-app-state.strict.json" --noEmit
bun "$ROOT_DIR/modern/client-web/tests/hash_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/app_state_runtime_test.ts"
