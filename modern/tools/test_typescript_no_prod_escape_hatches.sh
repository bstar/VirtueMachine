#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

matches="$(
  rg -n \
    -e 'as\s+unknown\s+as' \
    -e '@ts-ignore' \
    -e '@ts-expect-error' \
    -e 'eslint-disable' \
    "$ROOT_DIR/modern/common" \
    "$ROOT_DIR/modern/client-web" \
    "$ROOT_DIR/modern/net" \
    --glob '*.ts' \
    --glob '!**/tests/**' \
    --glob '!**/assets/**' \
    --glob '!**/fixtures/**' \
    || true
)"

if [[ -n "$matches" ]]; then
  printf '%s\n' "$matches"
  echo "Production TypeScript escape hatches are not allowed."
  exit 1
fi

echo "typescript_no_prod_escape_hatches: ok"
