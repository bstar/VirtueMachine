#!/usr/bin/env bash
set -euo pipefail

target="${1:-game}"
case "$target" in
  game|"")
    url="http://localhost:8080/modern/client-web/index.html"
    ;;
  probe)
    url="http://localhost:8080/modern/client-web/audio-autoplay-probe.html"
    ;;
  http://*|https://*)
    url="$target"
    ;;
  *)
    echo "Usage: $0 [game|probe|http://...]" >&2
    exit 2
    ;;
esac
profile_dir="${U6_BROWSER_PROFILE:-/tmp/ultima6-modern-autoplay-profile}"

browser="${BROWSER:-}"
if [[ -z "$browser" ]]; then
  for candidate in google-chrome-stable google-chrome chromium chromium-browser chrome; do
    if command -v "$candidate" >/dev/null 2>&1; then
      browser="$candidate"
      break
    fi
  done
fi

if [[ -z "$browser" ]]; then
  echo "No Chrome/Chromium browser found. Set BROWSER=/path/to/chrome and retry." >&2
  exit 1
fi

mkdir -p "$profile_dir"

exec "$browser" \
  --user-data-dir="$profile_dir" \
  --no-first-run \
  --new-window \
  --autoplay-policy=no-user-gesture-required \
  "$url"
