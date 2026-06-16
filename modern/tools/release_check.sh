#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run_browser_smoke="${VM_RELEASE_BROWSER_SMOKE:-auto}"
if [[ "${1:-}" == "--browser-smoke" ]]; then
  run_browser_smoke="on"
elif [[ "${1:-}" == "--no-browser-smoke" ]]; then
  run_browser_smoke="off"
elif [[ -n "${1:-}" ]]; then
  echo "Usage: $0 [--browser-smoke|--no-browser-smoke]" >&2
  exit 2
fi

cd "$ROOT_DIR"

npm test
npm run test:ci-required

case "$run_browser_smoke" in
  on)
    VM_BROWSER_SMOKE_STRICT=on VM_BROWSER_SMOKE_REQUIRE_SESSION=on npm run smoke:browser:movement
    ;;
  off)
    echo "release_check: browser movement smoke skipped (--no-browser-smoke)."
    ;;
  auto)
    if curl -fsS "http://127.0.0.1:8080/modern/client-web/index.html" >/dev/null 2>&1 \
      && curl -fsS "http://127.0.0.1:8081/health" >/dev/null 2>&1; then
      VM_BROWSER_SMOKE_STRICT=on VM_BROWSER_SMOKE_REQUIRE_SESSION=on npm run smoke:browser:movement
    else
      echo "release_check: browser movement smoke skipped (local web/net stack not running)."
      echo "release_check: start ./modern/tools/dev_stack.sh and rerun with --browser-smoke for full browser coverage."
    fi
    ;;
  *)
    echo "release_check: invalid VM_RELEASE_BROWSER_SMOKE=$run_browser_smoke (expected auto/on/off)." >&2
    exit 2
    ;;
esac

echo "release_check: ok"
