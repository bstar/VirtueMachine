#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="${1:-${U6_ASSET_DEST:-$ROOT_DIR/modern/assets/runtime}}"
REQ_MANIFEST="$ROOT_DIR/modern/assets/manifest.required.txt"
OPT_MANIFEST="$ROOT_DIR/modern/assets/manifest.optional.txt"

if [[ ! -d "$RUNTIME_DIR" ]]; then
  echo "Runtime asset directory not found: $RUNTIME_DIR"
  exit 2
fi

check_manifest() {
  local manifest="$1"
  local required="$2"
  local missing=0
  local raw name

  [[ -f "$manifest" ]] || return 0

  while IFS= read -r raw; do
    name="$(echo "$raw" | sed 's/[[:space:]]*$//')"
    [[ -z "$name" ]] && continue
    [[ "${name:0:1}" == "#" ]] && continue

    if ! find "$RUNTIME_DIR" -maxdepth 1 -type f -iname "$name" | head -n 1 | grep -q .; then
      if [[ "$required" == "1" ]]; then
        echo "MISSING REQUIRED: $name"
      else
        echo "MISSING OPTIONAL: $name"
      fi
      missing=$((missing + 1))
    fi
  done < "$manifest"

  return "$missing"
}

echo "Checking runtime assets in: $RUNTIME_DIR"

set +e
check_manifest "$REQ_MANIFEST" 1
req_missing=$?
check_manifest "$OPT_MANIFEST" 0
opt_missing=$?
set -e

echo "Required missing: $req_missing"
echo "Optional missing: $opt_missing"

if [[ "$req_missing" -ne 0 ]]; then
  echo "Asset preflight FAILED."
  exit 1
fi

echo "Asset preflight OK."
