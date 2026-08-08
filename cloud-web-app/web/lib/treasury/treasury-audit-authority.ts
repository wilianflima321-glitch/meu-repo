/**
 * H.1+ — Treasury / Hub checkout audit evidence authority (disk-backed).
 * Human/legal sign-off lives under `.aethel/treasury/audit/`.
 * Never invents PASS; empty or malformed certificates fail-closed.
 */

import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('treasury-audit-authority')

const AUDIT_DIR_SEGMENTS = ['.aethel', 'treasury', 'audit'] as const
export const HUB_CHECKOUT_CERTIFICATE_FILENAME = 'hub-checkout-certificate.json'
export const TREASURY_AUDIT_CERTIFICATE_KIND = 'hub_checkout_treasury_audit' as const
export const TREASURY_AUDIT_SCHEMA_VERSION = 1 as const

/** Human/legal checklist ids that must appear in the signed certificate. */
export const TREASURY_HUMAN_CHECKLIST_IDS = [
  'founder_treasury_signoff',
  'legal_kyc_tax_review',
  'coins_economy_policy',
] as const

export type TreasuryHumanChecklistId = (typeof TREASURY_HUMAN_CHECKLIST_IDS)[number]

export interface TreasuryAuditEvidenceCertificate {
  schemaVersion: typeof TREASURY_AUDIT_SCHEMA_VERSION
  kind: typeof TREASURY_AUDIT_CERTIFICATE_KIND
  /** Human auditor identity (name / role) — never empty. */
  auditor: string
  /** ISO-8601 audit timestamp. */
  auditedAt: string
  /** Checklist item ids explicitly signed by the auditor. */
  signedChecklistIds: string[]
  /** External evidence refs (tickets, legal memos, Stripe dashboard links). */
  evidenceRefs: string[]
  notes?: string
}

export function getTreasuryAuditRoot(cwd: string = process.cwd()): string {
  const base = process.env.AETHEL_TREASURY_AUDIT_ROOT
    ? path.resolve(process.env.AETHEL_TREASURY_AUDIT_ROOT)
    : path.resolve(cwd, ...AUDIT_DIR_SEGMENTS)
  return base
}

export function resolveHubCheckoutCertificatePath(cwd: string = process.cwd()): string {
  return path.join(getTreasuryAuditRoot(cwd), HUB_CHECKOUT_CERTIFICATE_FILENAME)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidIsoDate(value: string): boolean {
  const t = Date.parse(value)
  return Number.isFinite(t)
}

/**
 * Validate certificate shape. Fail-closed on any missing/invalid field.
 */
export function validateTreasuryAuditCertificate(
  raw: unknown,
): { ok: true; certificate: TreasuryAuditEvidenceCertificate } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'certificate_not_object' }
  }
  const obj = raw as Record<string, unknown>
  if (obj.schemaVersion !== TREASURY_AUDIT_SCHEMA_VERSION) {
    return { ok: false, reason: 'schema_version_mismatch' }
  }
  if (obj.kind !== TREASURY_AUDIT_CERTIFICATE_KIND) {
    return { ok: false, reason: 'kind_mismatch' }
  }
  if (!isNonEmptyString(obj.auditor)) {
    return { ok: false, reason: 'auditor_missing' }
  }
  if (!isNonEmptyString(obj.auditedAt) || !isValidIsoDate(obj.auditedAt)) {
    return { ok: false, reason: 'audited_at_invalid' }
  }
  if (!Array.isArray(obj.signedChecklistIds) || obj.signedChecklistIds.length === 0) {
    return { ok: false, reason: 'signed_checklist_empty' }
  }
  if (!obj.signedChecklistIds.every((id) => isNonEmptyString(id))) {
    return { ok: false, reason: 'signed_checklist_invalid' }
  }
  if (!Array.isArray(obj.evidenceRefs) || obj.evidenceRefs.length === 0) {
    return { ok: false, reason: 'evidence_refs_empty' }
  }
  if (!obj.evidenceRefs.every((ref) => isNonEmptyString(ref))) {
    return { ok: false, reason: 'evidence_refs_invalid' }
  }
  return {
    ok: true,
    certificate: {
      schemaVersion: TREASURY_AUDIT_SCHEMA_VERSION,
      kind: TREASURY_AUDIT_CERTIFICATE_KIND,
      auditor: obj.auditor.trim(),
      auditedAt: obj.auditedAt.trim(),
      signedChecklistIds: obj.signedChecklistIds.map((id) => String(id).trim()),
      evidenceRefs: obj.evidenceRefs.map((ref) => String(ref).trim()),
      notes: isNonEmptyString(obj.notes) ? obj.notes.trim() : undefined,
    },
  }
}

/**
 * Read durable Hub checkout audit certificate. Missing file → null (fail-closed).
 */
export function readHubCheckoutAuditCertificateSync(
  cwd: string = process.cwd(),
): TreasuryAuditEvidenceCertificate | null {
  const filePath = resolveHubCheckoutCertificatePath(cwd)
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
    const validated = validateTreasuryAuditCertificate(raw)
    if (!validated.ok) {
      log.warn('treasury_audit_certificate_invalid', { reason: validated.reason, filePath })
      return null
    }
    return validated.certificate
  } catch (err) {
    log.warn('treasury_audit_certificate_read_failed', {
      error: err instanceof Error ? err.message : String(err),
      filePath,
    })
    return null
  }
}

export async function readHubCheckoutAuditCertificate(
  cwd: string = process.cwd(),
): Promise<TreasuryAuditEvidenceCertificate | null> {
  const filePath = resolveHubCheckoutCertificatePath(cwd)
  try {
    const text = await fsPromises.readFile(filePath, 'utf8')
    const validated = validateTreasuryAuditCertificate(JSON.parse(text) as unknown)
    if (!validated.ok) {
      log.warn('treasury_audit_certificate_invalid', { reason: validated.reason, filePath })
      return null
    }
    return validated.certificate
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code !== 'ENOENT') {
      log.warn('treasury_audit_certificate_read_failed', {
        error: err instanceof Error ? err.message : String(err),
        filePath,
      })
    }
    return null
  }
}

/**
 * Human checklist item PASS only when a valid certificate signs that id.
 */
export function isHumanChecklistSigned(
  certificate: TreasuryAuditEvidenceCertificate | null,
  checklistId: TreasuryHumanChecklistId,
): boolean {
  if (!certificate) return false
  return certificate.signedChecklistIds.includes(checklistId)
}

/**
 * Forbidden theater unlocks. Always ignored — logged when present.
 * Never wire FORCE_HUB_CHECKOUT / AETHEL_FORCE_HUB_CHECKOUT into gates.
 */
export function detectForbiddenHubCheckoutForceEnv(): {
  present: boolean
  keys: string[]
} {
  const keys: string[] = []
  if (process.env.FORCE_HUB_CHECKOUT === '1' || process.env.FORCE_HUB_CHECKOUT === 'true') {
    keys.push('FORCE_HUB_CHECKOUT')
  }
  if (
    process.env.AETHEL_FORCE_HUB_CHECKOUT === '1' ||
    process.env.AETHEL_FORCE_HUB_CHECKOUT === 'true'
  ) {
    keys.push('AETHEL_FORCE_HUB_CHECKOUT')
  }
  if (keys.length > 0) {
    log.warn('forbidden_force_hub_checkout_ignored', { keys })
  }
  return { present: keys.length > 0, keys }
}

/** Production = NODE_ENV or VERCEL_ENV production — query overrides forbidden. */
export function isHubCheckoutProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  )
}
