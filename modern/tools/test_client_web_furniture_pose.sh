#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

npx tsc -p "$ROOT_DIR/tsconfig.client-furniture.strict.json" --noEmit
bun "$ROOT_DIR/modern/client-web/tests/furniture_pose_runtime_test.ts"
