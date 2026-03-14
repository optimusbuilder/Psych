#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/down.sh" --volumes
bash "$SCRIPT_DIR/up.sh"
bash "$SCRIPT_DIR/migrate.sh"
bash "$SCRIPT_DIR/seed.sh"

echo "Database reset complete."
