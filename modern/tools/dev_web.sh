#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Serving VirtueMachine web client at http://localhost:8080/modern/client-web/"
cd "$ROOT_DIR"
python3 -m http.server 8080
