#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bun "$ROOT_DIR/modern/net/tests/server_contract_test.ts"
