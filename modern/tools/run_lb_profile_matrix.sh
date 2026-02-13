#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

API_BASE="${VM_NET_API_BASE:-http://127.0.0.1:8081}"
USER_NAME="${VM_NET_USER:-avatar}"
USER_PASS="${VM_NET_PASS:-boob}"

if [[ "$#" -gt 0 ]]; then
  PROFILES=("$@")
else
  PROFILES=("baseline_a" "lb-clock-only" "lb-mirror-only" "lb-stool-only" "lb-bedroom-test")
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="$ROOT_DIR/modern/net/data/lb_matrix_$STAMP"
mkdir -p "$OUT_DIR"

SUMMARY="$OUT_DIR/summary.txt"
{
  echo "VirtueMachine LB Profile Matrix"
  echo "time_utc: $STAMP"
  echo "api: $API_BASE"
  echo "user: $USER_NAME"
  echo "profiles: ${PROFILES[*]}"
  echo
} > "$SUMMARY"

run_one() {
  local profile="$1"
  echo "=== $profile ===" | tee -a "$SUMMARY"

  if ! ./modern/tools/activate_baseline_profile.sh "$profile" --reload-net "$API_BASE" "$USER_NAME" "$USER_PASS" \
    > "$OUT_DIR/${profile}_activate.log" 2>&1; then
    echo "status=activate_failed" >> "$SUMMARY"
    echo "log=$OUT_DIR/${profile}_activate.log" >> "$SUMMARY"
    echo >> "$SUMMARY"
    return 0
  fi

  if ! ./modern/tools/check_lb_bedroom.sh \
    > "$OUT_DIR/${profile}_check.log" 2>&1; then
    echo "status=check_failed" >> "$SUMMARY"
    echo "log=$OUT_DIR/${profile}_check.log" >> "$SUMMARY"
    echo >> "$SUMMARY"
    return 0
  fi

  if [[ ! -f "$ROOT_DIR/modern/net/data/lb_bedroom_diff.json" ]]; then
    echo "status=missing_lb_bedroom_diff_json" >> "$SUMMARY"
    echo >> "$SUMMARY"
    return 0
  fi
  cp -f "$ROOT_DIR/modern/net/data/lb_bedroom_diff.json" "$OUT_DIR/${profile}_lb_bedroom_diff.json"

  node - <<'NODE' "$OUT_DIR/${profile}_lb_bedroom_diff.json" >> "$SUMMARY"
const fs = require("node:fs");
const file = process.argv[2];
const d = JSON.parse(fs.readFileSync(file, "utf8"));
const diffs = Array.isArray(d.diffs) ? d.diffs : [];
const fmt = (row) => {
  if (!row || !row.found || !row.delta) return `${row && row.name ? row.name : "?"}: not-found`;
  return `${row.name}: dx=${row.delta.dx},dy=${row.delta.dy},dz=${row.delta.dz}`;
};
const deltas = diffs.map(fmt).join(" | ");
const meta = d.meta || {};
console.log(`meta.loaded_at=${String(meta.loaded_at || "")}`);
console.log(`meta.source_dir=${String(meta.source_dir || "")}`);
console.log(`deltas=${deltas}`);
console.log("");
NODE
}

for p in "${PROFILES[@]}"; do
  if [[ ! -d "$ROOT_DIR/modern/assets/pristine/profiles/$p/savegame" ]]; then
    echo "SKIP missing profile: $p" | tee -a "$SUMMARY"
    echo >> "$SUMMARY"
    continue
  fi
  run_one "$p"
done

echo "Matrix complete."
echo "Output dir: $OUT_DIR"
echo "Summary: $SUMMARY"
