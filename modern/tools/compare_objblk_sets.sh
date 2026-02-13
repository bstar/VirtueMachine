#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -lt 2 ]]; then
  cat <<'EOF'
Usage:
  compare_objblk_sets.sh <set_a_dir> <set_b_dir>

Compares Ultima VI world object set files between two directories:
  - objlist
  - objblk??

For each file it reports:
  - present/missing
  - size equality
  - sha256 equality
  - first differing byte offset (when binary differs)

Exit code:
  0 when all files match
  1 when one or more files differ or are missing
EOF
  exit 2
fi

SET_A="$1"
SET_B="$2"

if [[ ! -d "$SET_A" ]]; then
  echo "ERROR: not a directory: $SET_A" >&2
  exit 2
fi
if [[ ! -d "$SET_B" ]]; then
  echo "ERROR: not a directory: $SET_B" >&2
  exit 2
fi

names=()
while IFS= read -r f; do
  names+=("$f")
done < <(
  {
    find "$SET_A" -maxdepth 1 -type f \( -name 'objlist' -o -name 'objblk??' \) -printf '%f\n'
    find "$SET_B" -maxdepth 1 -type f \( -name 'objlist' -o -name 'objblk??' \) -printf '%f\n'
  } | sort -u
)

if [[ ${#names[@]} -eq 0 ]]; then
  echo "ERROR: no objlist/objblk?? files found in either directory" >&2
  exit 2
fi

echo "Comparing object sets:"
echo "  A: $SET_A"
echo "  B: $SET_B"
echo

diff_count=0
missing_count=0
same_count=0

for name in "${names[@]}"; do
  a="$SET_A/$name"
  b="$SET_B/$name"

  if [[ ! -f "$a" || ! -f "$b" ]]; then
    echo "MISSING  $name"
    if [[ ! -f "$a" ]]; then
      echo "  - missing in A"
    fi
    if [[ ! -f "$b" ]]; then
      echo "  - missing in B"
    fi
    missing_count=$((missing_count + 1))
    continue
  fi

  size_a="$(wc -c < "$a" | tr -d ' ')"
  size_b="$(wc -c < "$b" | tr -d ' ')"
  hash_a="$(sha256sum "$a" | awk '{print $1}')"
  hash_b="$(sha256sum "$b" | awk '{print $1}')"

  if [[ "$size_a" == "$size_b" && "$hash_a" == "$hash_b" ]]; then
    echo "MATCH    $name size=$size_a sha256=${hash_a:0:12}..."
    same_count=$((same_count + 1))
    continue
  fi

  diff_count=$((diff_count + 1))
  echo "DIFF     $name"
  echo "  - size: A=$size_a B=$size_b"
  echo "  - sha256 A=$hash_a"
  echo "  - sha256 B=$hash_b"

  # cmp -l outputs differing bytes as 1-based positions.
  # We only need the first offset for quick triage.
  first_off="$(cmp -l "$a" "$b" 2>/dev/null | awk 'NR==1{print $1}')"
  if [[ -n "${first_off:-}" ]]; then
    echo "  - first differing byte offset (1-based): $first_off"
  else
    if [[ "$size_a" != "$size_b" ]]; then
      min_size="$size_a"
      if (( size_b < min_size )); then
        min_size="$size_b"
      fi
      echo "  - shared prefix identical for first $min_size bytes"
    else
      echo "  - byte-level delta present (offset unavailable)"
    fi
  fi
done

echo
echo "Summary:"
echo "  matched: $same_count"
echo "  different: $diff_count"
echo "  missing: $missing_count"
echo "  total: ${#names[@]}"

if (( diff_count > 0 || missing_count > 0 )); then
  exit 1
fi

exit 0
