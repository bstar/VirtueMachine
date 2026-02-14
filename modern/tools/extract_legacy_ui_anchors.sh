#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_DIR="$ROOT_DIR/legacy/u6-decompiled/SRC"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "legacy source directory not found: $SRC_DIR" >&2
  exit 1
fi

emit_section() {
  local title="$1"
  local pattern="$2"
  echo "## $title"
  if ! rg -n "$pattern" "$SRC_DIR" -S | head -n 80 | sed "s|$ROOT_DIR/||"; then
    true
  fi
  echo
}

cat <<'EOF'
# Legacy UI Canonical Anchors (Generated)

This report is generated from `legacy/u6-decompiled/SRC` and is intended to anchor
UI/panel parity work to canonical routines before visual polish.

EOF

emit_section "Input, Command Dispatch, Party Controls" "SetPartyMode|PartyModeMsg|CMD_83|CMD_90|CMD_91|TALK_talkTo|ch >= '0' && ch <= '9'"
emit_section "Inventory, Equipment, Character Panel" "display character's portrait/inventory|draw equipment|draw inventory|STAT_GetEquipSlot|InsertObj\\(|WeightInven|WeightEquip|EQUIP"
emit_section "Selection and Object Interaction Glue" "Selection\\.obj|GetCoordUse\\(|C_155D_1666|C_155D_16E7|SubMov\\("
emit_section "UI Framing and Cursor-Adjacent Routines" "mouse cursor|draw frame|Button party|Cursor"
emit_section "Core State Arrays/Globals (Party, Active, Selection)" "Party\\[|Active|StatusDisplay|D_04B3|D_2CC4"
