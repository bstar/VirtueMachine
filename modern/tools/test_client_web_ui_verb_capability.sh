#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

npx tsc -p "$ROOT_DIR/tsconfig.client-gameplay.strict.json" --noEmit
bun "$ROOT_DIR/modern/client-web/tests/ui_verb_capability_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/legacy_verb_runtime_test.ts"
