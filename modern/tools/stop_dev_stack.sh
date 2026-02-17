#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV_WEB_PORT="${DEV_WEB_PORT:-8080}"
VM_NET_PORT="${VM_NET_PORT:-8081}"

collect_listener_pids() {
  local port="$1"
  if [[ -z "$port" ]]; then
    return 0
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
    return 0
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null \
      | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
      | sort -u
    return 0
  fi
}

kill_process_set() {
  local label="$1"
  shift
  local pids=("$@")
  if [[ ${#pids[@]} -eq 0 ]]; then
    return 0
  fi
  echo "Stopping ${label}: ${pids[*]}"
  kill "${pids[@]}" 2>/dev/null || true
  sleep 0.2
  kill -9 "${pids[@]}" 2>/dev/null || true
}

kill_listener_port() {
  local port="$1"
  local pids=()
  while IFS= read -r pid; do
    [[ -n "$pid" ]] && pids+=("$pid")
  done < <(collect_listener_pids "$port")
  kill_process_set "listeners on :$port" "${pids[@]}"
}

main() {
  local known=()

  while IFS= read -r pid; do
    [[ -n "$pid" ]] && known+=("$pid")
  done < <(pgrep -f "bunx --bun vite --config $ROOT_DIR/vite.config.ts" 2>/dev/null || true)
  while IFS= read -r pid; do
    [[ -n "$pid" ]] && known+=("$pid")
  done < <(pgrep -f "python3 $ROOT_DIR/modern/tools/secure_web_server.py" 2>/dev/null || true)
  while IFS= read -r pid; do
    [[ -n "$pid" ]] && known+=("$pid")
  done < <(pgrep -f "bun $ROOT_DIR/modern/net/server.ts" 2>/dev/null || true)
  while IFS= read -r pid; do
    [[ -n "$pid" ]] && known+=("$pid")
  done < <(pgrep -f "$ROOT_DIR/modern/tools/dev_stack.sh" 2>/dev/null || true)

  if [[ ${#known[@]} -gt 0 ]]; then
    mapfile -t known < <(printf "%s\n" "${known[@]}" | sort -u)
  fi

  kill_process_set "known dev-stack processes" "${known[@]}"
  kill_listener_port "$DEV_WEB_PORT"
  kill_listener_port "$VM_NET_PORT"
}

main "$@"
