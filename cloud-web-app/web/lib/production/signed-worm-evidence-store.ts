/**
 * SF2 — Signed WORM (write-once-read-many) evidence store.
 * Append-only HMAC-SHA256 hash chain with optional durable file backing.
 * Distinct from Hub Coins mint/treasury and from N3 in-memory trade audit alone.
 * Fail-closed: verify rejects tampered chains; never claims investment-grade custody.
 */

import { createHmac, createHash, randomBytes, randomUUID } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('signed-worm-evidence-store')

/** Never conflate with Hub Aethel Coins (H.0 HELD). */
export const WORM_DOMAIN = 'shared-substrate-evidence' as const
export const HUB_COINS_DOMAIN_FORBIDDEN = 'hub-coins' as const

export type WormEvidenceKind =
  | 'audit-chain'
  | 'deterministic-replay'
  | 'trade-lifecycle'
  | 'agent-fusion-receipt'
  | 'risk-reject'

export interface WormEvidencePayload {
  kind: WormEvidenceKind
  title: string
  summary: string
  refs: string[]
  actor: string
}

export interface WormEvidenceEntry {
  id: string
  sequence: number
  domain: typeof WORM_DOMAIN
  payload: WormEvidencePayload
  prevHash: string
  entryHash: string
  /** HMAC-SHA256 over entryHash using store signing key. */
  signature: string
  createdAt: string
}

export interface SignedWormStore {
  version: 1
  storeId: string
  projectId: string
  domain: typeof WORM_DOMAIN
  genesisHash: string
  entries: readonly WormEvidenceEntry[]
  headHash: string
  /** Opaque key id — raw key never returned from probes. */
  keyId: string
  createdAt: string
  updatedAt: string
  /** Optional durable path (append-only JSONL). */
  durablePath: string | null
}

export type WormResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string }

const GENESIS = 'signed-worm-genesis'

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function hmacSign(key: Buffer, entryHash: string): string {
  return createHmac('sha256', key).update(entryHash).digest('hex')
}

function entryPayload(entry: Omit<WormEvidenceEntry, 'entryHash' | 'signature'>): string {
  return [
    entry.id,
    entry.sequence,
    entry.domain,
    entry.payload.kind,
    entry.payload.title,
    entry.payload.summary,
    entry.payload.refs.join(','),
    entry.payload.actor,
    entry.prevHash,
    entry.createdAt,
  ].join('|')
}

export type WormSigningMaterial = {
  keyId: string
  key: Buffer
}

/** Create ephemeral signing material (tests / in-memory). Not Hub Coins keys. */
export function createWormSigningMaterial(seed?: string): WormSigningMaterial {
  const key = seed
    ? createHash('sha256').update(`worm-key|${seed}`).digest()
    : randomBytes(32)
  const keyId = digest(`keyid|${key.toString('hex')}`).slice(0, 16)
  return { keyId, key }
}

export function createSignedWormStore(input: {
  projectId: string
  signing: WormSigningMaterial
  storeId?: string
  durablePath?: string | null
  now?: string
}): WormResult<SignedWormStore> {
  if (!input.projectId.trim()) {
    return { ok: false, code: 'invalid_project', message: 'projectId required' }
  }

  const now = input.now ?? new Date().toISOString()
  const storeId = input.storeId ?? randomUUID()
  const genesisHash = digest(`${GENESIS}|${storeId}|${input.projectId}|${WORM_DOMAIN}`)

  const store: SignedWormStore = {
    version: 1,
    storeId,
    projectId: input.projectId,
    domain: WORM_DOMAIN,
    genesisHash,
    entries: Object.freeze([]),
    headHash: genesisHash,
    keyId: input.signing.keyId,
    createdAt: now,
    updatedAt: now,
    durablePath: input.durablePath ?? null,
  }

  if (store.durablePath) {
    try {
      const dir = dirname(store.durablePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(
        store.durablePath,
        `${JSON.stringify({ type: 'genesis', store: stripForDurable(store) })}\n`,
        { encoding: 'utf8', flag: 'w' },
      )
    } catch (err) {
      return {
        ok: false,
        code: 'durable_init_failed',
        message: err instanceof Error ? err.message : 'durable init failed',
      }
    }
  }

  return { ok: true, value: Object.freeze(store) }
}

function stripForDurable(store: SignedWormStore): Omit<SignedWormStore, never> {
  return {
    version: store.version,
    storeId: store.storeId,
    projectId: store.projectId,
    domain: store.domain,
    genesisHash: store.genesisHash,
    entries: store.entries,
    headHash: store.headHash,
    keyId: store.keyId,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    durablePath: store.durablePath,
  }
}

export function appendWormEvidence(
  store: SignedWormStore,
  signing: WormSigningMaterial,
  input: {
    payload: WormEvidencePayload
    now?: string
  },
): WormResult<SignedWormStore> {
  if (signing.keyId !== store.keyId) {
    return { ok: false, code: 'key_mismatch', message: 'signing keyId does not match store' }
  }
  if (store.domain === (HUB_COINS_DOMAIN_FORBIDDEN as string)) {
    return { ok: false, code: 'hub_coins_forbidden', message: 'Hub Coins domain forbidden on WORM store' }
  }

  const createdAt = input.now ?? new Date().toISOString()
  const sequence = store.entries.length + 1
  const prevHash = store.headHash
  const id = `${store.storeId}:${sequence}:${input.payload.kind}`

  const withoutHash: Omit<WormEvidenceEntry, 'entryHash' | 'signature'> = {
    id,
    sequence,
    domain: WORM_DOMAIN,
    payload: input.payload,
    prevHash,
    createdAt,
  }

  const entryHash = digest(entryPayload(withoutHash))
  const signature = hmacSign(signing.key, entryHash)
  const entry: WormEvidenceEntry = { ...withoutHash, entryHash, signature }

  const next: SignedWormStore = {
    ...store,
    entries: Object.freeze([...store.entries, Object.freeze(entry)]),
    headHash: entryHash,
    updatedAt: createdAt,
  }

  if (store.durablePath) {
    try {
      appendFileSync(
        store.durablePath,
        `${JSON.stringify({ type: 'entry', entry })}\n`,
        { encoding: 'utf8' },
      )
    } catch (err) {
      return {
        ok: false,
        code: 'durable_append_failed',
        message: err instanceof Error ? err.message : 'durable append failed',
      }
    }
  }

  log.info('worm_evidence_appended', {
    storeId: store.storeId,
    sequence,
    kind: input.payload.kind,
    durable: Boolean(store.durablePath),
  })

  return { ok: true, value: Object.freeze(next) }
}

export function verifyWormChain(
  store: SignedWormStore,
  signing: WormSigningMaterial,
): { valid: boolean; reason?: string; fingerprint: string } {
  const fingerprint = fingerprintWormStore(store)

  if (signing.keyId !== store.keyId) {
    return { valid: false, reason: 'keyId mismatch', fingerprint }
  }
  if (store.domain !== WORM_DOMAIN) {
    return { valid: false, reason: 'invalid domain (Hub Coins forbidden)', fingerprint }
  }

  let expectedPrev = store.genesisHash
  for (const entry of store.entries) {
    if (entry.domain !== WORM_DOMAIN) {
      return { valid: false, reason: `forbidden domain at sequence ${entry.sequence}`, fingerprint }
    }
    if (entry.prevHash !== expectedPrev) {
      return { valid: false, reason: `broken prevHash at sequence ${entry.sequence}`, fingerprint }
    }
    const recomputed = digest(
      entryPayload({
        id: entry.id,
        sequence: entry.sequence,
        domain: entry.domain,
        payload: entry.payload,
        prevHash: entry.prevHash,
        createdAt: entry.createdAt,
      }),
    )
    if (recomputed !== entry.entryHash) {
      return { valid: false, reason: `entry hash mismatch at sequence ${entry.sequence}`, fingerprint }
    }
    const expectedSig = hmacSign(signing.key, entry.entryHash)
    if (expectedSig !== entry.signature) {
      return { valid: false, reason: `signature mismatch at sequence ${entry.sequence}`, fingerprint }
    }
    expectedPrev = entry.entryHash
  }

  if (store.headHash !== expectedPrev) {
    return { valid: false, reason: 'headHash does not match chain tail', fingerprint }
  }

  return { valid: true, fingerprint }
}

export function fingerprintWormStore(store: SignedWormStore): string {
  let chain = store.genesisHash
  for (const entry of store.entries) {
    chain = digest(`${chain}|${entry.entryHash}|${entry.signature}`)
  }
  return chain
}

/** Reload entries from durable JSONL and verify (fail-closed). */
export function loadAndVerifyDurableWorm(
  durablePath: string,
  signing: WormSigningMaterial,
): WormResult<{ store: SignedWormStore; valid: boolean; reason?: string }> {
  if (!existsSync(durablePath)) {
    return { ok: false, code: 'missing_file', message: `no durable file at ${durablePath}` }
  }

  try {
    const lines = readFileSync(durablePath, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    let store: SignedWormStore | null = null
    const entries: WormEvidenceEntry[] = []

    for (const line of lines) {
      const row = JSON.parse(line) as {
        type: string
        store?: SignedWormStore
        entry?: WormEvidenceEntry
      }
      if (row.type === 'genesis' && row.store) {
        store = {
          ...row.store,
          entries: Object.freeze([]),
          durablePath,
        }
      } else if (row.type === 'entry' && row.entry) {
        entries.push(row.entry)
      }
    }

    if (!store) {
      return { ok: false, code: 'no_genesis', message: 'durable file missing genesis' }
    }

    const rebuilt: SignedWormStore = {
      ...store,
      entries: Object.freeze(entries),
      headHash: entries.length > 0 ? entries[entries.length - 1]!.entryHash : store.genesisHash,
      durablePath,
    }

    const check = verifyWormChain(rebuilt, signing)
    return {
      ok: true,
      value: { store: Object.freeze(rebuilt), valid: check.valid, reason: check.reason },
    }
  } catch (err) {
    return {
      ok: false,
      code: 'durable_load_failed',
      message: err instanceof Error ? err.message : 'durable load failed',
    }
  }
}

export type Sf2WormProbeResult = {
  ready: boolean
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  chainValid: boolean
  signatureValid: boolean
  durableRoundTrip: boolean
  domain: typeof WORM_DOMAIN
  hubCoinsIsolated: true
  investmentGrade: false
  fingerprint: string
  entryCount: number
  path: string
  note: string
}

/** Probe SF2 signed WORM readiness — in-memory + temp durable round-trip. */
export function probeSignedWormReadiness(durablePath?: string): Sf2WormProbeResult {
  const signing = createWormSigningMaterial('sf2-probe-seed')
  const created = createSignedWormStore({
    projectId: 'sf2-probe',
    signing,
    durablePath: durablePath ?? null,
    now: '2026-08-10T15:00:00.000Z',
  })

  if (!created.ok) {
    return {
      ready: false,
      status: 'NOT_IMPLEMENTED',
      chainValid: false,
      signatureValid: false,
      durableRoundTrip: false,
      domain: WORM_DOMAIN,
      hubCoinsIsolated: true,
      investmentGrade: false,
      fingerprint: '',
      entryCount: 0,
      path: 'lib/production/signed-worm-evidence-store.ts',
      note: created.message,
    }
  }

  let store = created.value
  const a1 = appendWormEvidence(store, signing, {
    payload: {
      kind: 'deterministic-replay',
      title: 'SF2 probe replay',
      summary: 'Baseline hash match',
      refs: ['sf2:probe'],
      actor: 'sf2-probe',
    },
    now: '2026-08-10T15:00:01.000Z',
  })
  if (!a1.ok) {
    return failProbe(a1.message)
  }
  store = a1.value

  const a2 = appendWormEvidence(store, signing, {
    payload: {
      kind: 'audit-chain',
      title: 'SF2 probe audit',
      summary: 'Signed append',
      refs: ['sf2:audit'],
      actor: 'sf2-probe',
    },
    now: '2026-08-10T15:00:02.000Z',
  })
  if (!a2.ok) {
    return failProbe(a2.message)
  }
  store = a2.value

  const verify = verifyWormChain(store, signing)
  let durableRoundTrip = !store.durablePath
  if (store.durablePath) {
    const loaded = loadAndVerifyDurableWorm(store.durablePath, signing)
    durableRoundTrip = loaded.ok && loaded.value.valid
  }

  const ready = verify.valid && durableRoundTrip && store.domain === WORM_DOMAIN

  log.info('signed_worm_probed', {
    ready,
    entryCount: store.entries.length,
    durable: Boolean(store.durablePath),
  })

  return {
    ready,
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    chainValid: verify.valid,
    signatureValid: verify.valid,
    durableRoundTrip,
    domain: WORM_DOMAIN,
    hubCoinsIsolated: true,
    investmentGrade: false,
    fingerprint: verify.fingerprint,
    entryCount: store.entries.length,
    path: 'lib/production/signed-worm-evidence-store.ts',
    note: ready
      ? `SF2 PARTIAL — HMAC-signed hash chain (${store.entries.length} entries); optional durable JSONL; distinct from Hub Coins; investmentGrade false`
      : `SF2 probe failed: ${verify.reason ?? 'unknown'}`,
  }
}

function failProbe(message: string): Sf2WormProbeResult {
  return {
    ready: false,
    status: 'NOT_IMPLEMENTED',
    chainValid: false,
    signatureValid: false,
    durableRoundTrip: false,
    domain: WORM_DOMAIN,
    hubCoinsIsolated: true,
    investmentGrade: false,
    fingerprint: '',
    entryCount: 0,
    path: 'lib/production/signed-worm-evidence-store.ts',
    note: message,
  }
}
