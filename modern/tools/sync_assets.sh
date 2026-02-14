#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$ROOT_DIR/modern/assets/manifest.required.txt"
OPTIONAL_MANIFEST="$ROOT_DIR/modern/assets/manifest.optional.txt"
DEST_DIR="${U6_ASSET_DEST:-$ROOT_DIR/modern/assets/runtime}"
PRISTINE_DIR="${U6_ASSET_PRISTINE_DEST:-$ROOT_DIR/modern/assets/pristine/savegame}"
PRISTINE_ROOT="$(cd "$PRISTINE_DIR/.." && pwd)"
SRC_DIR="${1:-${U6_ASSET_SRC:-$ROOT_DIR/../ultima6}}"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Asset source directory not found: $SRC_DIR"
  echo "Set U6_ASSET_SRC or pass a path argument."
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "Manifest not found: $MANIFEST"
  exit 1
fi

mkdir -p "$DEST_DIR"
mkdir -p "$DEST_DIR/savegame"
mkdir -p "$PRISTINE_DIR"

copied=0
missing=0
optional_missing=0
savegame_copied=0
world_obj_source=""
world_objlist_source=""
tmp_obj_source=""

cleanup_tmp_obj_source() {
  if [[ -n "$tmp_obj_source" && -d "$tmp_obj_source" ]]; then
    rm -rf "$tmp_obj_source"
  fi
}
trap cleanup_tmp_obj_source EXIT

copy_from_manifest() {
  local manifest_file="$1"
  local required="$2"
  local raw name src_match base_name

  [[ -f "$manifest_file" ]] || return 0

  while IFS= read -r raw; do
    name="$(echo "$raw" | sed 's/[[:space:]]*$//')"
    [[ -z "$name" ]] && continue
    [[ "${name:0:1}" == "#" ]] && continue

    src_match="$(find "$SRC_DIR" -maxdepth 1 -type f -iname "$name" | head -n 1 || true)"
    if [[ -z "$src_match" ]]; then
      if [[ "$required" == "1" ]]; then
        echo "Missing required asset: $name"
        missing=$((missing + 1))
      else
        echo "Missing optional asset: $name"
        optional_missing=$((optional_missing + 1))
      fi
      continue
    fi

    base_name="$(basename "$src_match")"
    cp -f "$src_match" "$DEST_DIR/$base_name"
    copied=$((copied + 1))
  done < "$manifest_file"
}
copy_from_manifest "$MANIFEST" 1
copy_from_manifest "$OPTIONAL_MANIFEST" 0

# World object sources:
# 1) canonical root runtime files (preferred, usually pristine for parity)
# 2) root lzobjblk expansion (canonical fallback when root objblk?? are not present)
# 3) savegame directory (last resort; may reflect player-modified world state)
if find "$SRC_DIR" -maxdepth 1 -type f -iname "objblk??" -print -quit | grep -q .; then
  world_obj_source="$SRC_DIR"
  world_objlist_source="$SRC_DIR"
elif [[ -f "$SRC_DIR/lzobjblk" ]]; then
  tmp_obj_source="$(mktemp -d "${TMPDIR:-/tmp}/u6m_lzobjblk_XXXXXX")"
  node "$ROOT_DIR/modern/tools/extract_lzobjblk_savegame.js" "$SRC_DIR/lzobjblk" "$tmp_obj_source"
  world_obj_source="$tmp_obj_source"
  if [[ -f "$SRC_DIR/objlist" ]]; then
    world_objlist_source="$SRC_DIR"
  elif [[ -f "$SRC_DIR/savegame/objlist" ]]; then
    world_objlist_source="$SRC_DIR/savegame"
  fi
elif [[ -d "$SRC_DIR/savegame" ]] && find "$SRC_DIR/savegame" -maxdepth 1 -type f -iname "objblk??" -print -quit | grep -q .; then
  world_obj_source="$SRC_DIR/savegame"
  world_objlist_source="$SRC_DIR/savegame"
fi

if [[ -n "$world_obj_source" ]]; then
  if [[ -z "$world_objlist_source" ]]; then
    world_objlist_source="$world_obj_source"
  fi
  src_objlist="$(find "$world_objlist_source" -maxdepth 1 -type f -iname "objlist" | head -n 1 || true)"
  if [[ -n "$src_objlist" ]]; then
    cp -f "$src_objlist" "$DEST_DIR/savegame/objlist"
    cp -f "$src_objlist" "$PRISTINE_DIR/objlist"
    savegame_copied=$((savegame_copied + 1))
  else
    echo "Missing optional world object asset: objlist (source: $world_obj_source)"
  fi

  while IFS= read -r src_blk; do
    [[ -n "$src_blk" ]] || continue
    base_name="$(basename "$src_blk" | tr '[:upper:]' '[:lower:]')"
    cp -f "$src_blk" "$DEST_DIR/savegame/$base_name"
    cp -f "$src_blk" "$PRISTINE_DIR/$base_name"
    savegame_copied=$((savegame_copied + 1))
  done < <(find "$world_obj_source" -maxdepth 1 -type f -iname "objblk??" | sort)
else
  echo "Missing optional world object assets: objblk?? (checked: $SRC_DIR and $SRC_DIR/savegame)"
fi

echo "Copied $copied assets into $DEST_DIR"
echo "Copied $savegame_copied savegame assets into $DEST_DIR/savegame"
echo "Copied pristine object baseline into $PRISTINE_DIR"
printf "%s\n" "sync-default" > "$PRISTINE_ROOT/.active_profile"
printf "%s:%s\n" "sync-default" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$PRISTINE_ROOT/.baseline_version"
if [[ -n "$world_obj_source" ]]; then
  echo "World object source: $world_obj_source"
  if [[ "$world_obj_source" == "$SRC_DIR/savegame" ]]; then
    echo "WARNING: world objects sourced from savegame; placements may reflect a non-pristine world state."
    echo "For strict baseline parity, provide a source directory with canonical root objblk??/objlist files."
  fi
fi

if [[ $missing -ne 0 ]]; then
  echo "Missing $missing required assets. Fix source directory and rerun."
  exit 2
fi

if [[ $optional_missing -ne 0 ]]; then
  echo "Optional missing assets: $optional_missing"
fi

echo "Asset sync complete."
