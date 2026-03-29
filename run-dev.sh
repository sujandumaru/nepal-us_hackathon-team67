#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

(
  cd "$ROOT_DIR/chat"
  bash script.sh
) &
BACKEND_PID=$!

echo "Backend started on http://127.0.0.1:8000 (PID: $BACKEND_PID)"

cd "$ROOT_DIR"
npm run dev
