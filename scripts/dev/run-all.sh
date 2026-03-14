#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

API_PID=""
VITE_PID=""
NEXT_PID=""

cleanup() {
  local exit_code=$?
  echo
  echo "Shutting down dev processes..."

  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$VITE_PID" ]] && kill -0 "$VITE_PID" >/dev/null 2>&1; then
    kill "$VITE_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$NEXT_PID" ]] && kill -0 "$NEXT_PID" >/dev/null 2>&1; then
    kill "$NEXT_PID" >/dev/null 2>&1 || true
  fi

  wait >/dev/null 2>&1 || true
  exit "$exit_code"
}

trap cleanup INT TERM EXIT

SKIP_DB_BOOT="${SKIP_DB_BOOT:-0}"
DB_BOOT_MODE="${DB_BOOT_MODE:-up}"

if [[ ! -f ".env" ]]; then
  if [[ -f ".env.example" ]]; then
    echo "No .env found; creating one from .env.example"
    cp .env.example .env
  else
    echo "Missing .env and .env.example in $ROOT_DIR"
    exit 1
  fi
fi

if [[ ! -d "node_modules" ]]; then
  echo "Missing root node_modules. Run: npm install"
  exit 1
fi

if [[ ! -d "new_frontend/node_modules" ]]; then
  echo "Missing new_frontend/node_modules. Run: npm --prefix new_frontend install"
  exit 1
fi

if [[ "$SKIP_DB_BOOT" == "1" ]]; then
  echo "SKIP_DB_BOOT=1 -> skipping Docker DB bootstrap (up/migrate/seed)."
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker CLI not found."
    echo "Install/start Docker Desktop, or run with SKIP_DB_BOOT=1 if your DB is already running."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon is not running."
    echo "Start Docker Desktop and retry, or run with SKIP_DB_BOOT=1 if using an already-running database."
    exit 1
  fi

  if [[ "$DB_BOOT_MODE" == "reset" ]]; then
    echo "DB_BOOT_MODE=reset -> resetting DB volume and reapplying migrations + seed..."
    npm run db:reset
  else
    echo "Starting local database..."
    npm run db:up

    echo "Applying migrations..."
    migrate_output=""
    migrate_exit=0
    set +e
    migrate_output="$(npm run db:migrate 2>&1)"
    migrate_exit=$?
    set -e
    echo "$migrate_output"

    if [[ "$migrate_exit" -eq 0 ]]; then
      echo "Applying seed data..."
      npm run db:seed
    else
      if grep -Eqi "already exists|duplicate key value|relation .* already exists" <<<"$migrate_output"; then
        echo "Database appears already initialized; skipping migrate/seed."
        echo "Use DB_BOOT_MODE=reset npm run dev:all for a clean rebuild."
      else
        echo "Migration failed with an unexpected error."
        exit "$migrate_exit"
      fi
    fi
  fi
fi

echo
echo "Starting backend (http://localhost:4000)..."
npm run api:start &
API_PID=$!

echo "Starting Vite frontend (http://localhost:8080)..."
npm run dev &
VITE_PID=$!

NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:4000}"
echo "Starting Next frontend (http://localhost:3000) with NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL ..."
(
  cd new_frontend
  NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" npm run dev
) &
NEXT_PID=$!

echo
echo "All services started:"
echo "  - Backend:       http://localhost:4000"
echo "  - Vite frontend: http://localhost:8080"
echo "  - Next frontend: http://localhost:3000"
echo
echo "Press Ctrl+C to stop everything."

wait
