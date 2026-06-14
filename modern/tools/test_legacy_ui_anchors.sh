#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT="$("$ROOT_DIR/modern/tools/extract_legacy_ui_anchors.sh")"

rg -q "seg_0A33\\.c" <<<"$REPORT"
rg -q "seg_27a1\\.c" <<<"$REPORT"
rg -q "PartyModeMsg" <<<"$REPORT"
rg -q "STAT_GetEquipSlot" <<<"$REPORT"
rg -q "C_155D_1267" <<<"$REPORT"
rg -q "C_155D_130E" <<<"$REPORT"
rg -q "C_155D_0CF5" <<<"$REPORT"

echo "legacy_ui_anchors_test: ok"
