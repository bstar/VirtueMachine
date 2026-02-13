#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE_NAME="${1:-}"
SRC_INPUT="${2:-${U6_ASSET_SRC:-$ROOT_DIR/../ultima6}}"
ACTIVATE_NOW="${3:-}"

if [[ -z "$PROFILE_NAME" ]]; then
  echo "Usage: import_baseline_profile.sh <profile_name> [source_dir] [--activate]"
  exit 2
fi

SRC_DIR="$SRC_INPUT"
if [[ -d "$SRC_INPUT/savegame" ]] && find "$SRC_INPUT/savegame" -maxdepth 1 -type f -iname "objblk??" -print -quit | grep -q .; then
  SRC_DIR="$SRC_INPUT/savegame"
fi

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Source directory not found: $SRC_DIR" >&2
  exit 2
fi

if ! find "$SRC_DIR" -maxdepth 1 -type f -iname "objblk??" -print -quit | grep -q .; then
  echo "No objblk?? files found in source: $SRC_DIR" >&2
  exit 2
fi

PROFILE_DIR="$ROOT_DIR/modern/assets/pristine/profiles/$PROFILE_NAME/savegame"
mkdir -p "$PROFILE_DIR"

count=0
while IFS= read -r src_blk; do
  base_name="$(basename "$src_blk" | tr '[:upper:]' '[:lower:]')"
  cp -f "$src_blk" "$PROFILE_DIR/$base_name"
  count=$((count + 1))
done < <(find "$SRC_DIR" -maxdepth 1 -type f -iname "objblk??" | sort)

src_objlist="$(find "$SRC_DIR" -maxdepth 1 -type f -iname "objlist" | head -n 1 || true)"
if [[ -n "$src_objlist" ]]; then
  cp -f "$src_objlist" "$PROFILE_DIR/objlist"
  count=$((count + 1))
else
  echo "Missing objlist in source: $SRC_DIR" >&2
  exit 1
fi

echo "Imported baseline profile '$PROFILE_NAME' from $SRC_DIR"
echo "Files copied: $count"
echo "Profile path: $PROFILE_DIR"

if [[ "$ACTIVATE_NOW" == "--activate" ]]; then
  "$ROOT_DIR/modern/tools/activate_baseline_profile.sh" "$PROFILE_NAME"
fi
