#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/common.sh"

MIGRATIONS_DIR="$ROOT_DIR/db/migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

migration_files="$(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name "*.sql" | sort)"

if [[ -z "$migration_files" ]]; then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

migration_count="$(printf "%s\n" "$migration_files" | wc -l | tr -d ' ')"
echo "Applying ${migration_count} migration file(s)..."
while IFS= read -r file; do
  echo "-> $(basename "$file")"
  run_psql_file "$file"
done <<EOF
$migration_files
EOF

echo "Migrations applied successfully."
