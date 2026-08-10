/**
 * §23.D — Consent-gated shadow audit telemetry (cloud upload stub).
 * GDPR/LGPD: silent default-ON is FORBIDDEN. Fail-closed unless consent === true.
 * Local ledger may exist without cloud copy. Does not claim litigation invulnerability.
 */

import { createHash, randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('quant-shadow-audit-telemetry')

/** Default MUST be false — never silent opt-in. */
export const SHADOW_AUDIT_CLOUD_CONSENT_DEFAULT = false as const

export type ShadowAuditKind = 'order_log' | 'error_log' | 'risk_reject' | 'eula_attestation'

export type ShadowUploadRejectCode =
  | 'consent_required'
  | 'consent_not_true'
  | 'invalid_payload'
  | 'cloud_upload_stub_only'

export type ShadowUploadResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ShadowUploadRejectCode; message: string }

export interface ShadowAuditConsent {
  accountId: string
  /** Explicit opt-in — must be literal true. */
  cloudAuditUploadConsent: boolean
  consentedAt: string | null
  /** Retention purpose disclosed to user (litigation defense / dispute evidence). */
  purpose: 'litigation_defense_evidence'
}

export interface ShadowAuditPayload {
  kind: ShadowAuditKind
  accountId: string
  /** Pre-hashed / redacted body — never raw exchange secrets. */
  encryptedOrHashedBody: string
  localLedgerEntryId: string
  createdAt?: string
}

export interface ShadowAuditUploadReceipt {
  uploadId: string
  accountId: string
  kind: ShadowAuditKind
  payloadHash: string
  /** Stub: no real cloud durable write yet. */
  cloudPersisted: false
  consented: true
  createdAt: string
}

export function createShadowAuditConsent(input: {
  accountId: string
  cloudAuditUploadConsent: boolean
  now?: string
}): ShadowAuditConsent {
  const consented = input.cloudAuditUploadConsent === true
  return {
    accountId: input.accountId,
    cloudAuditUploadConsent: consented,
    consentedAt: consented ? (input.now ?? new Date().toISOString()) : null,
    purpose: 'litigation_defense_evidence',
  }
}

function payloadHash(body: string, kind: ShadowAuditKind, accountId: string): string {
  return createHash('sha256').update(`${kind}|${accountId}|${body}`).digest('hex')
}

/**
 * Attempt cloud shadow upload. Fail-closed unless consent is explicitly true.
 * Even with consent, this is a stub receipt — not a production WORM cloud vault.
 */
export function attemptShadowAuditCloudUpload(
  consent: ShadowAuditConsent | null | undefined,
  payload: ShadowAuditPayload,
): ShadowUploadResult<ShadowAuditUploadReceipt> {
  if (!consent) {
    return {
      ok: false,
      code: 'consent_required',
      message: 'cloud shadow audit upload blocked — no consent record (default OFF)',
    }
  }
  if (consent.cloudAuditUploadConsent !== true) {
    log.info('shadow_audit_upload_blocked_no_consent', { accountId: consent.accountId })
    return {
      ok: false,
      code: 'consent_not_true',
      message: 'cloud shadow audit upload blocked — consent must be explicit true (GDPR/LGPD)',
    }
  }
  if (consent.accountId !== payload.accountId) {
    return {
      ok: false,
      code: 'invalid_payload',
      message: 'consent accountId must match payload accountId',
    }
  }
  if (!payload.encryptedOrHashedBody.trim() || !payload.localLedgerEntryId.trim()) {
    return {
      ok: false,
      code: 'invalid_payload',
      message: 'encryptedOrHashedBody and localLedgerEntryId required',
    }
  }

  const createdAt = payload.createdAt ?? new Date().toISOString()
  const receipt: ShadowAuditUploadReceipt = {
    uploadId: randomUUID(),
    accountId: payload.accountId,
    kind: payload.kind,
    payloadHash: payloadHash(payload.encryptedOrHashedBody, payload.kind, payload.accountId),
    cloudPersisted: false,
    consented: true,
    createdAt,
  }

  log.info('shadow_audit_upload_stub_accepted', {
    uploadId: receipt.uploadId,
    kind: receipt.kind,
    cloudPersisted: false,
  })

  return { ok: true, value: receipt }
}

export function probeShadowAuditTelemetryReadiness(): {
  ready: boolean
  status: 'PARTIAL'
  path: string
  defaultConsentOn: false
  note: string
} {
  const noConsent = attemptShadowAuditCloudUpload(null, {
    kind: 'error_log',
    accountId: 'a',
    encryptedOrHashedBody: 'hash',
    localLedgerEntryId: 'local-1',
  })
  const falseConsent = attemptShadowAuditCloudUpload(
    createShadowAuditConsent({ accountId: 'a', cloudAuditUploadConsent: false }),
    {
      kind: 'error_log',
      accountId: 'a',
      encryptedOrHashedBody: 'hash',
      localLedgerEntryId: 'local-1',
    },
  )
  const withConsent = attemptShadowAuditCloudUpload(
    createShadowAuditConsent({ accountId: 'a', cloudAuditUploadConsent: true }),
    {
      kind: 'order_log',
      accountId: 'a',
      encryptedOrHashedBody: 'hash',
      localLedgerEntryId: 'local-2',
    },
  )
  const ready =
    noConsent.ok === false &&
    falseConsent.ok === false &&
    withConsent.ok === true &&
    withConsent.value.cloudPersisted === false &&
    SHADOW_AUDIT_CLOUD_CONSENT_DEFAULT === false

  return {
    ready,
    status: 'PARTIAL',
    path: 'lib/server/quant/shadow-audit-telemetry.ts',
    defaultConsentOn: false,
    note: ready
      ? 'Consent-gated upload stub — silent telemetry FORBIDDEN; durable cloud WORM still HELD.'
      : 'Shadow audit telemetry probe failed.',
  }
}
