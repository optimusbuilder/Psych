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
had_idempotent_warnings=0
while IFS= read -r file; do
  echo "-> $(basename "$file")"
  output=""
  if output="$(run_psql_file "$file" 2>&1)"; then
    if [[ -n "$output" ]]; then
      echo "$output"
    fi
    continue
  fi

  if [[ -n "$output" ]]; then
    echo "$output"
  fi

  if grep -Eqi "already exists|duplicate key value|relation .* already exists" <<<"$output"; then
    echo "   (skipped: migration appears already applied)"
    had_idempotent_warnings=1
    continue
  fi

  echo "Migration failed with an unexpected error while applying $(basename "$file")." >&2
  exit 1
done <<EOF
$migration_files
EOF

if [[ "$had_idempotent_warnings" -eq 1 ]]; then
  echo "Migrations completed with idempotent skips."
else
  echo "Migrations applied successfully."
fi
