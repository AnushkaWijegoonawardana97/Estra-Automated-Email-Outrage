#!/usr/bin/env bash
# Open separate Terminal.app windows for each pipeline worker (macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER="$ROOT/scripts/open-pipeline-worker.sh"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "dev:pipeline only supports macOS (Terminal.app)."
  echo "Run workers manually in separate terminals:"
  echo "  bash scripts/open-pipeline-worker.sh scrape 3600"
  echo "  bash scripts/open-pipeline-worker.sh enrich 45"
  echo "  bash scripts/open-pipeline-worker.sh find_email 45"
  echo "  bash scripts/open-pipeline-worker.sh send 90"
  echo "  bash scripts/open-pipeline-worker.sh jobs 15"
  exit 1
fi

if [[ ! -x "$WORKER" ]]; then
  chmod +x "$WORKER"
fi

# Pass the shell command via argv so paths with spaces never break AppleScript quoting.
open_terminal() {
  local step="$1"
  local interval="$2"
  local cmd="bash '$WORKER' $step $interval"
  osascript \
    -e 'on run argv' \
    -e 'tell application "Terminal"' \
    -e 'activate' \
    -e 'do script (item 1 of argv)' \
    -e 'end tell' \
    -e 'end run' \
    -- "$cmd"
}

echo "Opening pipeline workers in separate Terminal windows…"
echo "Repo: $ROOT"
echo ""

open_terminal scrape 3600
sleep 0.5
open_terminal enrich 45
sleep 0.5
open_terminal find_email 45
sleep 0.5
open_terminal send 90
sleep 0.5
open_terminal jobs 15
sleep 0.5
open_terminal follow_up 600

echo ""
echo "Started workers:"
echo "  scrape      every 3600s"
echo "  enrich      every 45s"
echo "  find_email  every 45s"
echo "  send        every 90s"
echo "  jobs        every 15s  (dashboard triggers)"
echo "  follow_up   every 600s"
echo ""
echo "Also run the dashboard in another terminal: pnpm dev"
