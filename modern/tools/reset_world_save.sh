#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_DIR="${VM_NET_DATA_DIR:-$ROOT_DIR/modern/net/data}"

mkdir -p "$DATA_DIR"

cat > "$DATA_DIR/world_snapshot.json" <<'JSON'
{
  "snapshot_meta": {
    "schema_version": 1,
    "sim_core_version": "client-web-js",
    "saved_tick": 0,
    "snapshot_hash": null
  },
  "snapshot_base64": null,
  "updated_at": "1970-01-01T00:00:00.000Z"
}
JSON

cat > "$DATA_DIR/presence.json" <<'JSON'
[]
JSON

echo "Reset canonical world snapshot and cleared presence in: $DATA_DIR"
