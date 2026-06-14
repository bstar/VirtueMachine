#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
npx tsc -p "$ROOT_DIR/tsconfig.common.strict.json" --noEmit
bun "$ROOT_DIR/modern/common/tests/runtime_contract_test.ts"
