#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

bun "$ROOT_DIR/modern/tools/generate_ui_probe_fixture.ts" --verify
