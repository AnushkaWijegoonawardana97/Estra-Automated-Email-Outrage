#!/usr/bin/env bash
# Run one pipeline worker in the current terminal (used by dev-pipeline-terminals.sh).
set -euo pipefail

STEP="${1:?Usage: open-pipeline-worker.sh <step> [interval_seconds]}"
INTERVAL="${2:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/pipeline"

if [[ -f ".venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
fi

TITLE="Estra | ${STEP}"
printf '\033]0;%s\007' "$TITLE"

PYTHON="python3"
if ! command -v python3 >/dev/null 2>&1; then
  PYTHON="python"
fi

ARGS=("$PYTHON" dev_worker.py --step "$STEP")
if [[ -n "$INTERVAL" ]]; then
  ARGS+=(--interval "$INTERVAL")
fi

echo "[$TITLE] Starting in $ROOT/pipeline"
exec "${ARGS[@]}"
