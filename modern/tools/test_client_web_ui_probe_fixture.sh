#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

npx tsc -p "$ROOT_DIR/tsconfig.client-ui-probe-contract.strict.json" --noEmit
bun "$ROOT_DIR/modern/tools/generate_ui_probe_fixture.ts" --verify
