/**
 * §23.B/C — EULA risk-acceptance + anti-fraud attestation hash.
 * Exact phrase gate. Live path stays blocked without acceptance + N2 quarantine.
 * Does NOT claim legal invulnerability — evidence only.
 */

import { createHash, randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('quant-eula-risk-acceptance')

/**
 * Exact phrase the user must type. Whitespace-normalized exact match (case-sensitive).
 * Changing this string invalidates prior acceptances (new hash domain).
 */
export const QUANT_RISK_ACCEPTANCE_PHRASE =
  'I UNDERSTAND THAT AETHEL PROVIDES NON-CUSTODIAL SOFTWARE ONLY AND THAT I ALONE BEAR ALL TRADING LOSSES AND REGULATORY RISK' as const

export type EulaRejectCode =
  | 'phrase_mismatch'
  | 'missing_account'
  | 'missing_hwid'
  | 'missing_ip'
  | 'already_accepted'
  | 'acceptance_required'

export type EulaResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: EulaRejectCode; message: string }

export interface EulaAcceptanceInput {
  accountId: string
  hwid: string
  /** Client IP as observed by server — stored hashed, never as marketing claim. */
  ipAddress: string
  typedPhrase: string
  now?: string
}

export interface EulaAcceptanceRecord {
  acceptanceId: string
  accountId: string
  /** sha256(phrase|hwid|accountId|timestamp) */
  attestationHash: string
  /** sha256(ip|hwid|accountId) — anti-fraud binding, not a legal shield. */
  antiFraudBindingHash: string
  phraseVersion: typeof QUANT_RISK_ACCEPTANCE_PHRASE
  acceptedAt: string
  /** Live broker still HELD — this only records consent evidence. */
  liveBrokerUnlocked: false
}

function normalizePhrase(phrase: string): string {
  return phrase.trim().replace(/\s+/g, ' ')
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function hashRiskAcceptanceAttestation(input: {
  phrase: string
  hwid: string
  accountId: string
  timestamp: string
}): string {
  return sha256(
    `${normalizePhrase(input.phrase)}|${input.hwid}|${input.accountId}|${input.timestamp}`,
  )
}

export function hashAntiFraudBinding(input: {
  ipAddress: string
  hwid: string
  accountId: string
}): string {
  return sha256(`${input.ipAddress}|${input.hwid}|${input.accountId}`)
}

export function assertExactRiskPhrase(typedPhrase: string): EulaResult<{ phrase: typeof QUANT_RISK_ACCEPTANCE_PHRASE }> {
  if (normalizePhrase(typedPhrase) !== QUANT_RISK_ACCEPTANCE_PHRASE) {
    return {
      ok: false,
      code: 'phrase_mismatch',
      message: 'typed phrase must match the exact risk-acceptance sentence',
    }
  }
  return { ok: true, value: { phrase: QUANT_RISK_ACCEPTANCE_PHRASE } }
}

/**
 * Record EULA acceptance. Fail-closed on phrase / identity gaps.
 * Does not enable a live broker adapter.
 */
export function recordEulaRiskAcceptance(input: EulaAcceptanceInput): EulaResult<EulaAcceptanceRecord> {
  if (!input.accountId.trim()) {
    return { ok: false, code: 'missing_account', message: 'accountId required' }
  }
  if (!input.hwid.trim()) {
    return { ok: false, code: 'missing_hwid', message: 'hwid required' }
  }
  if (!input.ipAddress.trim()) {
    return { ok: false, code: 'missing_ip', message: 'ipAddress required' }
  }

  const phraseGate = assertExactRiskPhrase(input.typedPhrase)
  if (!phraseGate.ok) return phraseGate

  const acceptedAt = input.now ?? new Date().toISOString()
  const attestationHash = hashRiskAcceptanceAttestation({
    phrase: QUANT_RISK_ACCEPTANCE_PHRASE,
    hwid: input.hwid,
    accountId: input.accountId,
    timestamp: acceptedAt,
  })
  const antiFraudBindingHash = hashAntiFraudBinding({
    ipAddress: input.ipAddress,
    hwid: input.hwid,
    accountId: input.accountId,
  })

  const record: EulaAcceptanceRecord = {
    acceptanceId: randomUUID(),
    accountId: input.accountId,
    attestationHash,
    antiFraudBindingHash,
    phraseVersion: QUANT_RISK_ACCEPTANCE_PHRASE,
    acceptedAt,
    liveBrokerUnlocked: false,
  }

  log.info('eula_risk_acceptance_recorded', {
    acceptanceId: record.acceptanceId,
    accountId: record.accountId,
    attestationHash: record.attestationHash.slice(0, 16),
    liveBrokerUnlocked: false,
  })

  return { ok: true, value: record }
}

export function requireEulaAcceptance(
  record: EulaAcceptanceRecord | null | undefined,
  accountId: string,
): EulaResult<EulaAcceptanceRecord> {
  if (!record || record.accountId !== accountId) {
    return {
      ok: false,
      code: 'acceptance_required',
      message: 'Vanguard live path blocked — EULA risk acceptance required',
    }
  }
  return { ok: true, value: record }
}

export function probeEulaRiskAcceptanceReadiness(): {
  ready: boolean
  status: 'PARTIAL'
  path: string
  note: string
} {
  const reject = recordEulaRiskAcceptance({
    accountId: 'acct',
    hwid: 'hw-1',
    ipAddress: '127.0.0.1',
    typedPhrase: 'wrong phrase',
  })
  const accept = recordEulaRiskAcceptance({
    accountId: 'acct',
    hwid: 'hw-1',
    ipAddress: '127.0.0.1',
    typedPhrase: QUANT_RISK_ACCEPTANCE_PHRASE,
    now: '2026-08-10T15:00:00.000Z',
  })
  const ready = reject.ok === false && accept.ok === true && accept.value.liveBrokerUnlocked === false
  return {
    ready,
    status: 'PARTIAL',
    path: 'lib/server/quant/eula-risk-acceptance.ts',
    note: ready
      ? 'Exact-phrase EULA + attestation hash wired; live broker remains HELD.'
      : 'EULA risk-acceptance probe failed.',
  }
}
