#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-}"
BUILD_DIR="${2:-}"

if [[ -z "$ROOT_DIR" || -z "$BUILD_DIR" ]]; then
  echo "Usage: $0 <root_dir> <build_dir>" >&2
  exit 2
fi

configure_cmake() {
  if [[ -f "$BUILD_DIR/CMakeCache.txt" ]]; then
    if cmake -S "$ROOT_DIR" -B "$BUILD_DIR"; then
      return 0
    fi
    echo "Existing CMake cache is invalid for this environment; recreating build dir..."
    rm -rf "$BUILD_DIR"
  fi

  if [[ -n "${U6M_CMAKE_GENERATOR:-}" ]]; then
    cmake -S "$ROOT_DIR" -B "$BUILD_DIR" -G "$U6M_CMAKE_GENERATOR"
    return 0
  fi

  if command -v ninja >/dev/null 2>&1; then
    cmake -S "$ROOT_DIR" -B "$BUILD_DIR" -G Ninja
    return 0
  fi

  cmake -S "$ROOT_DIR" -B "$BUILD_DIR"
}

configure_cmake
