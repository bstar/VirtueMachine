#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <peer_a_checkpoints.csv> <peer_b_checkpoints.csv>" >&2
  exit 2
fi

peer_a="$1"
peer_b="$2"

if [[ ! -f "$peer_a" ]]; then
  echo "error: missing file: $peer_a" >&2
  exit 2
fi
if [[ ! -f "$peer_b" ]]; then
  echo "error: missing file: $peer_b" >&2
  exit 2
fi

validate_csv() {
  local path="$1"
  awk -F',' '
    function norm(v) {
      gsub(/\r/, "", v)
      gsub(/^[ \t]+|[ \t]+$/, "", v)
      return tolower(v)
    }
    NR == 1 {
      if (norm($1) != "tick" || norm($2) != "hash") {
        printf("error: invalid header in %s (expected tick,hash)\n", FILENAME) > "/dev/stderr"
        exit 2
      }
      next
    }
    NF < 2 {
      printf("error: malformed checkpoint row %d in %s\n", NR, FILENAME) > "/dev/stderr"
      exit 2
    }
  ' "$path"
}

validate_csv "$peer_a"
validate_csv "$peer_b"

awk -F',' '
  function norm(v) {
    gsub(/\r/, "", v)
    gsub(/^[ \t]+|[ \t]+$/, "", v)
    return tolower(v)
  }

  NR == FNR {
    if (FNR == 1) {
      next
    }
    a_tick[FNR] = $1 + 0
    a_hash[FNR] = norm($2)
    a_lines = FNR
    next
  }

  {
    if (FNR == 1) {
      next
    }

    if (!(FNR in a_tick)) {
      printf("DESYNC: peer B has extra checkpoint at line %d (tick=%d hash=%s)\n", FNR, $1 + 0, norm($2))
      exit 1
    }

    b_tick = $1 + 0
    b_hash = norm($2)

    if (b_tick != a_tick[FNR] || b_hash != a_hash[FNR]) {
      printf("DESYNC at line %d: A(tick=%d hash=%s) vs B(tick=%d hash=%s)\n",
             FNR, a_tick[FNR], a_hash[FNR], b_tick, b_hash)
      exit 1
    }

    b_lines = FNR
  }

  END {
    if (a_lines != b_lines) {
      printf("DESYNC: checkpoint count mismatch A=%d B=%d\n", a_lines - 1, b_lines - 1)
      exit 1
    }

    printf("SYNC: %d checkpoints match\n", a_lines - 1)
  }
' "$peer_a" "$peer_b"
