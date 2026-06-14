#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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
