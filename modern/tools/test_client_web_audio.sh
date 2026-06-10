#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bun "$ROOT_DIR/modern/client-web/tests/audio_pc_speaker_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/audio_u6m_music_runtime_test.ts"
bun "$ROOT_DIR/modern/client-web/tests/audio_runtime_mute_test.ts"
