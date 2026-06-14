#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

bun "$ROOT_DIR/modern/client-web/tests/object_footprint_runtime_test.ts"
