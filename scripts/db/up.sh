#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/common.sh"

compose up -d postgres

echo "Waiting for Postgres to become healthy..."
compose ps
compose exec -T postgres \
  env PGPASSWORD="$POSTGRES_PASSWORD" \
  sh -c "until pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" >/dev/null 2>&1; do sleep 1; done"

echo "Postgres is ready on port $POSTGRES_PORT."
