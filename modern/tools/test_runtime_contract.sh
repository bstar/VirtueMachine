#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
node "$ROOT_DIR/modern/common/tests/runtime_contract_test.mjs"
