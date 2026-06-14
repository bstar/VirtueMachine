#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
npx tsc -p "$ROOT_DIR/tsconfig.client-net.strict.json" --noEmit
bun "$ROOT_DIR/modern/client-web/tests/net_auth_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/net_account_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/net_character_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/net_panel_bindings_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/net_presence_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/net_profile_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/net_runtime_profile_config_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/net_snapshot_runtime_test.ts"
