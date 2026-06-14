#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
npx tsc -p "$ROOT_DIR/tsconfig.net.world.strict.json" --noEmit
npx tsc -p "$ROOT_DIR/tsconfig.net-utils.strict.json" --noEmit
npx tsc -p "$ROOT_DIR/tsconfig.net-npc.strict.json" --noEmit
npx tsc -p "$ROOT_DIR/tsconfig.net-server-runtime.strict.json" --noEmit
npx tsc -p "$ROOT_DIR/tsconfig.net-server-entry.strict.json" --noEmit
bun "$ROOT_DIR/modern/net/tests/world_assoc_chain_bridge_test.ts"
bun "$ROOT_DIR/modern/net/tests/world_object_collision_test.ts"
bun "$ROOT_DIR/modern/net/tests/world_object_policy_test.ts"
bun "$ROOT_DIR/modern/net/tests/world_object_state_runtime_test.ts"
bun "$ROOT_DIR/modern/net/tests/npc_runtime_schedule_test.ts"
bun "$ROOT_DIR/modern/net/tests/server_file_store_test.ts"
bun "$ROOT_DIR/modern/net/tests/server_http_runtime_test.ts"
bun "$ROOT_DIR/modern/net/tests/server_runtime_test.ts"
bun "$ROOT_DIR/modern/net/tests/email_runtime_test.ts"
bun "$ROOT_DIR/modern/net/tests/server_account_runtime_test.ts"
bun "$ROOT_DIR/modern/net/tests/server_contract_test.ts"
