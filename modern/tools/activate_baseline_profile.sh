#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE_NAME="${1:-}"
NET_RELOAD="${2:-}"
NET_API_BASE="${3:-${VM_NET_API_BASE:-http://127.0.0.1:8081}}"
NET_USER="${4:-${VM_NET_USER:-avatar}}"
NET_PASS="${5:-${VM_NET_PASS:-boob}}"

if [[ -z "$PROFILE_NAME" ]]; then
  echo "Usage: activate_baseline_profile.sh <profile_name> [--reload-net] [api_base] [username] [password]"
  exit 2
fi

PROFILE_DIR="$ROOT_DIR/modern/assets/pristine/profiles/$PROFILE_NAME/savegame"
ACTIVE_DIR="$ROOT_DIR/modern/assets/pristine/savegame"
MARKER_FILE="$ROOT_DIR/modern/assets/pristine/.active_profile"
VERSION_FILE="$ROOT_DIR/modern/assets/pristine/.baseline_version"

if [[ ! -d "$PROFILE_DIR" ]]; then
  echo "Profile does not exist: $PROFILE_DIR" >&2
  exit 2
fi

objblk_count="$(find "$PROFILE_DIR" -maxdepth 1 -type f -iname 'objblk??' | wc -l | tr -d ' ')"
if [[ "$objblk_count" -lt 64 ]]; then
  echo "Profile is incomplete: expected >=64 objblk files, found $objblk_count" >&2
  exit 1
fi
if [[ ! -f "$PROFILE_DIR/objlist" ]]; then
  echo "Profile is missing objlist: $PROFILE_DIR/objlist" >&2
  exit 1
fi

mkdir -p "$ACTIVE_DIR"
find "$ACTIVE_DIR" -maxdepth 1 -type f -iname 'objblk??' -delete
rm -f "$ACTIVE_DIR/objlist"

while IFS= read -r src_blk; do
  cp -f "$src_blk" "$ACTIVE_DIR/$(basename "$src_blk")"
done < <(find "$PROFILE_DIR" -maxdepth 1 -type f -iname "objblk??" | sort)
cp -f "$PROFILE_DIR/objlist" "$ACTIVE_DIR/objlist"

printf "%s\n" "$PROFILE_NAME" > "$MARKER_FILE"
printf "%s:%s\n" "$PROFILE_NAME" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$VERSION_FILE"

echo "Activated baseline profile: $PROFILE_NAME"
echo "Active baseline dir: $ACTIVE_DIR"

if [[ "$NET_RELOAD" == "--reload-net" ]]; then
  bun "$ROOT_DIR/modern/tools/reload_net_baseline.ts" --api "$NET_API_BASE" --user "$NET_USER" --pass "$NET_PASS"
fi
