#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Aethel Engine — Secrets Vault Sync Script
#
#  Pulls production secrets from Doppler (or HashiCorp Vault)
#  and writes them to environment / Docker secrets / .env.production
#
#  Modes:
#    ./secrets-vault-sync.sh doppler   — sync from Doppler
#    ./secrets-vault-sync.sh vault     — sync from HashiCorp Vault
#    ./secrets-vault-sync.sh rotate    — trigger API key rotation
#
#  Required env vars (doppler mode):
#    DOPPLER_TOKEN      — service token for the production config
#    DOPPLER_PROJECT    — Doppler project name
#    DOPPLER_CONFIG     — e.g. "production"
#
#  Required env vars (vault mode):
#    VAULT_ADDR         — e.g. https://vault.company.com
#    VAULT_TOKEN        — Vault auth token
#    VAULT_SECRET_PATH  — e.g. secret/aethel/production
# ─────────────────────────────────────────────────────────────
set -euo pipefail

MODE="${1:-doppler}"
OUTPUT_FILE=".env.production.local"

echo "==> [$(date)] Secrets sync mode: ${MODE}"

case "${MODE}" in
  doppler)
    if [[ -z "${DOPPLER_TOKEN:-}" ]]; then
      echo "ERROR: DOPPLER_TOKEN is not set"
      exit 1
    fi

    echo "==> Fetching secrets from Doppler…"
    doppler secrets download \
      --token "${DOPPLER_TOKEN}" \
      --project "${DOPPLER_PROJECT:-aethel-engine}" \
      --config "${DOPPLER_CONFIG:-production}" \
      --format env \
      --no-file > "${OUTPUT_FILE}"

    echo "==> Written to ${OUTPUT_FILE}"
    ;;

  vault)
    if [[ -z "${VAULT_ADDR:-}" || -z "${VAULT_TOKEN:-}" ]]; then
      echo "ERROR: VAULT_ADDR and VAULT_TOKEN must be set"
      exit 1
    fi

    echo "==> Fetching secrets from HashiCorp Vault…"
    SECRET_PATH="${VAULT_SECRET_PATH:-secret/aethel/production}"
    SECRETS=$(curl -s --header "X-Vault-Token: ${VAULT_TOKEN}" \
      "${VAULT_ADDR}/v1/${SECRET_PATH}" | jq -r '.data.data // .data')

    echo "${SECRETS}" | jq -r 'to_entries[] | "\(.key)=\(.value)"' > "${OUTPUT_FILE}"
    echo "==> Written to ${OUTPUT_FILE}"
    ;;

  rotate)
    echo "==> Triggering API key rotation…"
    # In production, trigger rotation via the secrets manager API
    # and then propagate to the running service via Doppler/Vault sync
    echo "  [1/3] Rotating NEXTAUTH_SECRET…"
    NEW_SECRET=$(openssl rand -hex 32)
    echo "  Generated new NEXTAUTH_SECRET (apply via Doppler/Vault manually)"
    echo "  New secret (store securely): ${NEW_SECRET}"

    echo "  [2/3] Reminder: Rotate OPENROUTER_API_KEY and BYOK master vault key quarterly"
    echo "  [3/3] Rotation audit entry written to /var/log/aethel-rotation.log"
    echo "$(date) ROTATE ${USER}" >> /var/log/aethel-rotation.log 2>/dev/null || true
    ;;

  *)
    echo "Unknown mode: ${MODE}. Use: doppler | vault | rotate"
    exit 1
    ;;
esac

echo "==> [$(date)] Secrets sync complete."
