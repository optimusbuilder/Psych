#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/common.sh"

compose exec postgres \
  env PGPASSWORD="$POSTGRES_PASSWORD" \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
