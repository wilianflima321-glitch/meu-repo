/**
 * §23.C — Admin-bound EULA acceptance attestation (append-only server store).
 * Ties IP+HWID anti-fraud hash to account. Evidence for disputes — not "untouchable" legal armor.
 */

import { createHash, randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  QUANT_RISK_ACCEPTANCE_PHRASE,
  recordEulaRiskAcceptance,
  type EulaAcceptanceRecord,
} from '@/lib/server/quant/eula-risk-acceptance'

const log = createComponentLogger('quant-acceptance-attestation')

export const ATTESTATION_DOMAIN = 'quant-eula-attestation' as const

export interface AttestationEntry {
  id: string
  sequence: number
  domain: typeof ATTESTATION_DOMAIN
  accountId: string
  acceptanceId: string
  attestationHash: string
  antiFraudBindingHash: string
  prevHash: string
  entryHash: string
  createdAt: string
}

export interface AcceptanceAttestationStore {
  storeId: string
  domain: typeof ATTESTATION_DOMAIN
  genesisHash: string
  entries: AttestationEntry[]
  headHash: string
  createdAt: string
  updatedAt: string
}

export type AttestationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string }

const GENESIS = 'quant-eula-attestation-genesis'

/** Process-local append-only store (API stub backing). */
const GLOBAL_STORES = new Map<string, AcceptanceAttestationStore>()

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function entryDigest(parts: {
  id: string
  sequence: number
  accountId: string
  acceptanceId: string
  attestationHash: string
  antiFraudBindingHash: string
  prevHash: string
  createdAt: string
}): string {
  return digest(
    [
      parts.id,
      parts.sequence,
      ATTESTATION_DOMAIN,
      parts.accountId,
      parts.acceptanceId,
      parts.attestationHash,
      parts.antiFraudBindingHash,
      parts.prevHash,
      parts.createdAt,
    ].join('|'),
  )
}

export function createAcceptanceAttestationStore(input?: {
  storeId?: string
  now?: string
}): AcceptanceAttestationStore {
  const now = input?.now ?? new Date().toISOString()
  const storeId = input?.storeId ?? randomUUID()
  const genesisHash = digest(`${GENESIS}|${storeId}|${ATTESTATION_DOMAIN}`)
  const store: AcceptanceAttestationStore = {
    storeId,
    domain: ATTESTATION_DOMAIN,
    genesisHash,
    entries: [],
    headHash: genesisHash,
    createdAt: now,
    updatedAt: now,
  }
  GLOBAL_STORES.set(storeId, store)
  return store
}

export function getOrCreateDefaultAttestationStore(): AcceptanceAttestationStore {
  const existing = GLOBAL_STORES.get('default')
  if (existing) return existing
  return createAcceptanceAttestationStore({ storeId: 'default' })
}

export function appendEulaAttestation(
  store: AcceptanceAttestationStore,
  record: EulaAcceptanceRecord,
  now?: string,
): AttestationResult<{ store: AcceptanceAttestationStore; entry: AttestationEntry }> {
  if (!record.accountId.trim() || !record.attestationHash.trim()) {
    return { ok: false, code: 'invalid_record', message: 'accountId and attestationHash required' }
  }

  const createdAt = now ?? new Date().toISOString()
  const id = randomUUID()
  const sequence = store.entries.length
  const prevHash = store.headHash
  const entryHash = entryDigest({
    id,
    sequence,
    accountId: record.accountId,
    acceptanceId: record.acceptanceId,
    attestationHash: record.attestationHash,
    antiFraudBindingHash: record.antiFraudBindingHash,
    prevHash,
    createdAt,
  })

  const entry: AttestationEntry = {
    id,
    sequence,
    domain: ATTESTATION_DOMAIN,
    accountId: record.accountId,
    acceptanceId: record.acceptanceId,
    attestationHash: record.attestationHash,
    antiFraudBindingHash: record.antiFraudBindingHash,
    prevHash,
    entryHash,
    createdAt,
  }

  const next: AcceptanceAttestationStore = {
    ...store,
    entries: [...store.entries, entry],
    headHash: entryHash,
    updatedAt: createdAt,
  }
  GLOBAL_STORES.set(store.storeId, next)

  log.info('eula_attestation_appended', {
    storeId: store.storeId,
    sequence,
    accountId: record.accountId,
  })

  return { ok: true, value: { store: next, entry } }
}

export function verifyAttestationChain(store: AcceptanceAttestationStore): {
  valid: boolean
  brokenAt: number | null
} {
  let prev = store.genesisHash
  for (let i = 0; i < store.entries.length; i++) {
    const e = store.entries[i]!
    if (e.prevHash !== prev) return { valid: false, brokenAt: i }
    const expected = entryDigest({
      id: e.id,
      sequence: e.sequence,
      accountId: e.accountId,
      acceptanceId: e.acceptanceId,
      attestationHash: e.attestationHash,
      antiFraudBindingHash: e.antiFraudBindingHash,
      prevHash: e.prevHash,
      createdAt: e.createdAt,
    })
    if (expected !== e.entryHash) return { valid: false, brokenAt: i }
    prev = e.entryHash
  }
  if (store.entries.length === 0 && store.headHash !== store.genesisHash) {
    return { valid: false, brokenAt: 0 }
  }
  if (store.entries.length > 0 && store.headHash !== store.entries[store.entries.length - 1]!.entryHash) {
    return { valid: false, brokenAt: store.entries.length - 1 }
  }
  return { valid: true, brokenAt: null }
}

export function listAttestationsForAccount(
  store: AcceptanceAttestationStore,
  accountId: string,
): AttestationEntry[] {
  return store.entries.filter((e) => e.accountId === accountId)
}

export function probeAcceptanceAttestationReadiness(): {
  ready: boolean
  status: 'PARTIAL'
  path: string
  note: string
} {
  const store = createAcceptanceAttestationStore({ storeId: `probe-${randomUUID()}` })
  const eula = recordEulaRiskAcceptance({
    accountId: 'probe-acct',
    hwid: 'hw-probe',
    ipAddress: '10.0.0.1',
    typedPhrase: QUANT_RISK_ACCEPTANCE_PHRASE,
    now: '2026-08-10T15:00:00.000Z',
  })
  if (!eula.ok) {
    return {
      ready: false,
      status: 'PARTIAL',
      path: 'lib/server/quant/acceptance-attestation-store.ts',
      note: 'EULA record failed during attestation probe.',
    }
  }
  const appended = appendEulaAttestation(store, eula.value, '2026-08-10T15:00:01.000Z')
  const chain = verifyAttestationChain(appended.ok ? appended.value.store : store)
  const ready = appended.ok === true && chain.valid
  return {
    ready,
    status: 'PARTIAL',
    path: 'lib/server/quant/acceptance-attestation-store.ts',
    note: ready
      ? 'Append-only EULA attestation store wired (in-memory API stub) — not litigation invulnerability.'
      : 'Attestation store probe failed.',
  }
}
