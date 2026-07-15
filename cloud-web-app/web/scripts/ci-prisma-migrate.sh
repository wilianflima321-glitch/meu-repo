#!/usr/bin/env bash
#
# CI / deployment entry point for Prisma migrations.
#
# - Fails fast if DATABASE_URL is unset or clearly points at localhost while
#   NODE_ENV=production (defence-in-depth against pushing prod migrations from
#   the wrong shell).
# - Runs `prisma migrate deploy` (never `migrate dev`, never `db push`).
# - Prints applied + pending migrations for audit logs.
#
# Usage:
#   DATABASE_URL=... ./scripts/ci-prisma-migrate.sh

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "FATAL: DATABASE_URL must be set." >&2
  exit 1
fi

if [[ "${NODE_ENV:-}" == "production" && "$DATABASE_URL" == *"localhost"* ]]; then
  echo "FATAL: Refusing to run migrations against a localhost DATABASE_URL while NODE_ENV=production." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Prisma migrate status"
npx prisma migrate status || true

echo "==> Prisma migrate deploy"
npx prisma migrate deploy

echo "==> Post-deploy status"
npx prisma migrate status

echo "==> Done."
