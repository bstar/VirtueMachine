#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

matches="$(
  rg -n \
    '(:\s*any\b|as\s+any\b|<[^>]*\bany\b|Map<\s*any\b|Array<\s*any\b|\bany\[\])' \
    "$ROOT_DIR/modern" \
    --glob '*.ts' \
    --glob '!**/assets/**' \
    --glob '!**/fixtures/**' \
    || true
)"

if [[ -n "$matches" ]]; then
  printf '%s\n' "$matches"
  echo "Explicit TypeScript any usage is not allowed."
  exit 1
fi

echo "typescript_no_explicit_any: ok"
