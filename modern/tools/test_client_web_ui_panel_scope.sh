#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

bun "$ROOT_DIR/modern/client-web/tests/ui_panel_scope_runtime_test.ts"
