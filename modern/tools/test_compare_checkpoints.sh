#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOL="$ROOT_DIR/modern/tools/compare_checkpoints.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cat > "$TMP_DIR/a.csv" <<'CSV'
tick,hash
5,aaaaaaaaaaaaaaaa
10,bbbbbbbbbbbbbbbb
CSV

cat > "$TMP_DIR/b.csv" <<'CSV'
tick,hash
5,aaaaaaaaaaaaaaaa
10,bbbbbbbbbbbbbbbb
CSV

cat > "$TMP_DIR/c.csv" <<'CSV'
tick,hash
5,aaaaaaaaaaaaaaaa
10,deadbeefdeadbeef
CSV

"$TOOL" "$TMP_DIR/a.csv" "$TMP_DIR/b.csv" >/dev/null

if "$TOOL" "$TMP_DIR/a.csv" "$TMP_DIR/c.csv" >/dev/null 2>&1; then
  echo "FAIL: expected desync tool to report mismatch" >&2
  exit 1
fi

echo "PASS: compare checkpoints"
