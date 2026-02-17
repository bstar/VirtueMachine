#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bun "$ROOT_DIR/modern/client-web/tests/conversation_script_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/conversation_behavior_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/conversation_transcript_alignment_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/conversation_dialog_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/conversation_session_runtime_test.ts"
