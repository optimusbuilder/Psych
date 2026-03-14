#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/common.sh"

REMOVE_VOLUMES="${1:-}"
if [[ "$REMOVE_VOLUMES" == "--volumes" ]]; then
  compose down --volumes
  echo "Postgres stopped and volumes removed."
else
  compose down
  echo "Postgres stopped."
fi
