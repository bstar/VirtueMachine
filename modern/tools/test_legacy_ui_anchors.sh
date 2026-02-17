#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT="$("$ROOT_DIR/modern/tools/extract_legacy_ui_anchors.sh")"

echo "$REPORT" | rg -q "seg_0A33\\.c"
echo "$REPORT" | rg -q "seg_27a1\\.c"
echo "$REPORT" | rg -q "PartyModeMsg"
echo "$REPORT" | rg -q "STAT_GetEquipSlot"
echo "$REPORT" | rg -q "C_155D_1267"
echo "$REPORT" | rg -q "C_155D_130E"
echo "$REPORT" | rg -q "C_155D_0CF5"

echo "legacy_ui_anchors_test: ok"
