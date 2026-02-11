#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$ROOT_DIR/modern/assets/manifest.required.txt"
OPTIONAL_MANIFEST="$ROOT_DIR/modern/assets/manifest.optional.txt"
DEST_DIR="${U6_ASSET_DEST:-$ROOT_DIR/modern/assets/runtime}"
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

copied=0
missing=0
optional_missing=0

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

echo "Copied $copied assets into $DEST_DIR"

if [[ $missing -ne 0 ]]; then
  echo "Missing $missing required assets. Fix source directory and rerun."
  exit 2
fi

if [[ $optional_missing -ne 0 ]]; then
  echo "Optional missing assets: $optional_missing"
fi

echo "Asset sync complete."
