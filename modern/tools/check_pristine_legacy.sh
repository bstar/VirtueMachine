#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

# Compare against merge-base with main if available.
range=""
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  if git show-ref --verify --quiet refs/heads/main; then
    base="$(git merge-base HEAD main)"
    range="$base...HEAD"
  elif git show-ref --verify --quiet refs/remotes/origin/main; then
    base="$(git merge-base HEAD origin/main)"
    range="$base...HEAD"
  elif git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    range="HEAD~1...HEAD"
  fi
fi

# On a brand new repository with no commits yet, there's no commit range to inspect.
if [[ -z "$range" ]]; then
  echo "No commit range yet; checking working tree constraints only."
elif git diff --name-only "$range" | rg '^legacy/u6-decompiled$'; then
  echo "Policy violation: legacy submodule pointer changed."
  echo "Legacy updates must be explicit and documented decisions."
  exit 2
fi

# Reject dirty submodule working tree (local edits inside legacy mirror).
if ! git -C legacy/u6-decompiled diff --quiet || ! git -C legacy/u6-decompiled diff --cached --quiet; then
  echo "Policy violation: local edits detected inside legacy/u6-decompiled."
  echo "Keep legacy source pristine; implement changes under modern/."
  exit 2
fi

echo "Pristine legacy check passed."
