#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/common.sh"

SEEDS_DIR="$ROOT_DIR/db/seeds"

if [[ ! -d "$SEEDS_DIR" ]]; then
  echo "Seeds directory not found: $SEEDS_DIR" >&2
  exit 1
fi

seed_files="$(find "$SEEDS_DIR" -maxdepth 1 -type f -name "*.sql" | sort)"

if [[ -z "$seed_files" ]]; then
  echo "No seed files found in $SEEDS_DIR"
  exit 0
fi

seed_count="$(printf "%s\n" "$seed_files" | wc -l | tr -d ' ')"
echo "Applying ${seed_count} seed file(s)..."
while IFS= read -r file; do
  echo "-> $(basename "$file")"
  run_psql_file "$file"
done <<EOF
$seed_files
EOF

echo "Seed data applied successfully."
