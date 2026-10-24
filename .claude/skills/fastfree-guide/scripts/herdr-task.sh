#!/usr/bin/env bash
set -euo pipefail

# Herdr Task Orchestrator Script
CMD="${1:-list}"

case "$CMD" in
  list)
    herdr agent list
    ;;
  split-run)
    TARGET_CMD="${2:-echo 'Herdr Task'}"
    herdr pane split right --command "$TARGET_CMD"
    ;;
  send)
    PANE="${2:-w3:p3}"
    MSG="${3:-Hello sibling agent}"
    herdr pane send "$PANE" "$MSG"
    ;;
  *)
    echo "Usage: $0 {list|split-run [command]|send [pane] [message]}"
    exit 1
    ;;
esac
