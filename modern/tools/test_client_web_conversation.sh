#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
node "$ROOT_DIR/modern/client-web/tests/conversation_script_test.mjs"
node "$ROOT_DIR/modern/client-web/tests/conversation_behavior_test.mjs"
node "$ROOT_DIR/modern/client-web/tests/conversation_transcript_alignment_test.mjs"
