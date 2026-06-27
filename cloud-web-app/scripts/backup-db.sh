#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Aethel Engine — PostgreSQL Backup Script
#  Backs up the database to S3 with timestamp and rotation.
#
#  Required env vars:
#    DATABASE_URL   — postgres://user:pass@host:5432/dbname
#    S3_BUCKET      — e.g. s3://aethel-backups
#    AWS_REGION     — e.g. us-east-1
#
#  Optional env vars:
#    BACKUP_RETENTION_DAYS — default: 30
#    SLACK_WEBHOOK_URL     — notify on failure
# ─────────────────────────────────────────────────────────────
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="aethel_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo "==> [$(date)] Starting Aethel DB backup…"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

if [[ -z "${S3_BUCKET:-}" ]]; then
  echo "ERROR: S3_BUCKET is not set"
  exit 1
fi

# Dump and compress
pg_dump "${DATABASE_URL}" --no-owner --no-acl --format=plain | gzip > "/tmp/${BACKUP_FILE}"

echo "==> Backup created: /tmp/${BACKUP_FILE} ($(du -sh /tmp/${BACKUP_FILE} | cut -f1))"

# Upload to S3
aws s3 cp "/tmp/${BACKUP_FILE}" "${S3_BUCKET}/database/${BACKUP_FILE}" \
  --region "${AWS_REGION:-us-east-1}" \
  --storage-class STANDARD_IA

echo "==> Uploaded to ${S3_BUCKET}/database/${BACKUP_FILE}"

# Cleanup local file
rm "/tmp/${BACKUP_FILE}"

# Remove old backups from S3
echo "==> Pruning backups older than ${RETENTION_DAYS} days…"
CUTOFF=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -v "-${RETENTION_DAYS}d" +%Y-%m-%dT%H:%M:%S)

aws s3 ls "${S3_BUCKET}/database/" | while read -r _date _time _size filename; do
  FILE_DATE=$(echo "${filename}" | grep -oP '\d{8}' | head -1)
  if [[ -n "${FILE_DATE}" ]]; then
    FILE_ISO="${FILE_DATE:0:4}-${FILE_DATE:4:2}-${FILE_DATE:6:2}T00:00:00"
    if [[ "${FILE_ISO}" < "${CUTOFF}" ]]; then
      echo "  Removing old backup: ${filename}"
      aws s3 rm "${S3_BUCKET}/database/${filename}" --region "${AWS_REGION:-us-east-1}"
    fi
  fi
done

echo "==> [$(date)] Backup complete."
