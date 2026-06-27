#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Aethel Engine — PostgreSQL Restore Script
#
#  Usage:
#    ./restore-db.sh <backup-filename>   (e.g. aethel_db_20260627_010000.sql.gz)
#    ./restore-db.sh --latest            (restores most recent S3 backup)
#
#  Required env vars:
#    DATABASE_URL   — target postgres connection string
#    S3_BUCKET      — e.g. s3://aethel-backups
#    AWS_REGION
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_FILE="${1:-}"

if [[ -z "${DATABASE_URL:-}" || -z "${S3_BUCKET:-}" ]]; then
  echo "ERROR: DATABASE_URL and S3_BUCKET must be set"
  exit 1
fi

if [[ "${BACKUP_FILE}" == "--latest" ]]; then
  echo "==> Finding latest backup in S3…"
  BACKUP_FILE=$(aws s3 ls "${S3_BUCKET}/database/" --region "${AWS_REGION:-us-east-1}" \
    | sort | tail -n1 | awk '{print $4}')
  echo "==> Latest backup: ${BACKUP_FILE}"
fi

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: ./restore-db.sh <filename> | --latest"
  exit 1
fi

echo "==> [$(date)] Downloading ${BACKUP_FILE} from S3…"
aws s3 cp "${S3_BUCKET}/database/${BACKUP_FILE}" "/tmp/${BACKUP_FILE}" \
  --region "${AWS_REGION:-us-east-1}"

echo "==> Restoring database…"
echo "    WARNING: This will DROP and recreate the public schema!"
read -r -p "    Type 'RESTORE' to confirm: " CONFIRM
if [[ "${CONFIRM}" != "RESTORE" ]]; then
  echo "Aborted."
  exit 1
fi

gunzip -c "/tmp/${BACKUP_FILE}" | psql "${DATABASE_URL}"

rm "/tmp/${BACKUP_FILE}"

echo "==> [$(date)] Restore complete."
