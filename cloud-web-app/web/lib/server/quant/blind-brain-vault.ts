/**
 * SF6 — Blind Brain AES-256-GCM exchange-key vault (local custody pattern).
 * Real crypto wrap/unwrap; opaque `local:blind-brain:*` refs only.
 * Fail-closed: no platform DB plaintext; HSM / production custody stay false.
 * Distinct from Law XVI BYOK (LLM) and Hub Coins (H.0 HELD).
 */

import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  isOpaqueExchangeKeyRef,
  mintLocalExchangeKeyRef,
  type ExchangeKeyRef,
} from '@/lib/server/quant/non-custodial-invariants'

const log = createComponentLogger('blind-brain-vault')

export const BLIND_BRAIN_VAULT_VERSION = 1 as const
export const BLIND_BRAIN_HSM_READY = false as const
export const BLIND_BRAIN_PRODUCTION_CUSTODY_READY = false as const

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const PBKDF2_ITERS = 120_000
const SALT_LENGTH = 16

export type BlindBrainRejectCode =
  | 'invalid_passphrase'
  | 'invalid_secret'
  | 'invalid_ref'
  | 'entry_not_found'
  | 'auth_tag_mismatch'
  | 'kill_switch_armed'
  | 'platform_persist_forbidden'
  | 'hsm_unavailable'
  | 'production_custody_held'

export type BlindBrainResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: BlindBrainRejectCode; message: string }

/** Ciphertext envelope — never contains plaintext exchange secret. */
export interface BlindBrainSealedEntry {
  version: typeof BLIND_BRAIN_VAULT_VERSION
  keyRef: ExchangeKeyRef
  ciphertextB64: string
  ivB64: string
  tagB64: string
  saltB64: string
  createdAt: string
  /** Fingerprint of ciphertext only — safe to log. */
  sealFingerprint: string
}

export interface BlindBrainVaultState {
  entries: Map<ExchangeKeyRef, BlindBrainSealedEntry>
  killSwitchArmed: boolean
  hsmReady: typeof BLIND_BRAIN_HSM_READY
  productionCustodyReady: typeof BLIND_BRAIN_PRODUCTION_CUSTODY_READY
  investmentGrade: false
  liveBrokerReady: false
}

function deriveWrapKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, PBKDF2_ITERS, KEY_LENGTH, 'sha512')
}

function sealFingerprint(ciphertextB64: string, ivB64: string, tagB64: string): string {
  return createHash('sha256')
    .update(`bb|${ciphertextB64}|${ivB64}|${tagB64}`)
    .digest('hex')
    .slice(0, 24)
}

function looksLikeRawSecret(value: string): boolean {
  return /^(?:[A-Za-z0-9+/]{32,}={0,2}|[0-9a-fA-F]{40,})$/.test(value.trim())
}

export function createBlindBrainVault(): BlindBrainVaultState {
  return {
    entries: new Map(),
    killSwitchArmed: false,
    hsmReady: BLIND_BRAIN_HSM_READY,
    productionCustodyReady: BLIND_BRAIN_PRODUCTION_CUSTODY_READY,
    investmentGrade: false,
    liveBrokerReady: false,
  }
}

export function armBlindBrainKillSwitch(vault: BlindBrainVaultState): BlindBrainVaultState {
  log.warn('blind_brain_kill_switch_armed', {})
  return { ...vault, killSwitchArmed: true, entries: new Map(vault.entries) }
}

export function disarmBlindBrainKillSwitch(vault: BlindBrainVaultState): BlindBrainVaultState {
  return { ...vault, killSwitchArmed: false, entries: new Map(vault.entries) }
}

/**
 * Wrap an exchange secret under a local passphrase.
 * Returns opaque keyRef + sealed entry — plaintext must never leave the call site into platform DB.
 */
export function sealExchangeSecret(input: {
  vault: BlindBrainVaultState
  localHandle: string
  plaintextSecret: string
  passphrase: string
  now?: string
}): BlindBrainResult<{ vault: BlindBrainVaultState; entry: BlindBrainSealedEntry }> {
  if (input.vault.killSwitchArmed) {
    return {
      ok: false,
      code: 'kill_switch_armed',
      message: 'Blind Brain kill-switch armed — seal/unwrap rejected',
    }
  }
  if (!input.passphrase || input.passphrase.length < 12) {
    return {
      ok: false,
      code: 'invalid_passphrase',
      message: 'local passphrase must be at least 12 characters',
    }
  }
  const secret = input.plaintextSecret?.trim() ?? ''
  if (!secret || secret.length < 8) {
    return { ok: false, code: 'invalid_secret', message: 'exchange secret too short' }
  }

  const ref = mintLocalExchangeKeyRef(input.localHandle)
  if (!ref.ok) {
    return { ok: false, code: 'invalid_ref', message: ref.message }
  }

  const salt = randomBytes(SALT_LENGTH)
  const key = deriveWrapKey(input.passphrase, salt)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  const ciphertextB64 = encrypted.toString('base64')
  const ivB64 = iv.toString('base64')
  const tagB64 = tag.toString('base64')
  const entry: BlindBrainSealedEntry = {
    version: BLIND_BRAIN_VAULT_VERSION,
    keyRef: ref.value,
    ciphertextB64,
    ivB64,
    tagB64,
    saltB64: salt.toString('base64'),
    createdAt: input.now ?? new Date().toISOString(),
    sealFingerprint: sealFingerprint(ciphertextB64, ivB64, tagB64),
  }

  const nextEntries = new Map(input.vault.entries)
  nextEntries.set(ref.value, entry)
  const vault: BlindBrainVaultState = {
    ...input.vault,
    entries: nextEntries,
  }

  log.info('blind_brain_secret_sealed', {
    keyRef: entry.keyRef,
    fingerprint: entry.sealFingerprint,
    hsmReady: false,
  })
  return { ok: true, value: { vault, entry } }
}

/** Unwrap only with local passphrase; never claims HSM. */
export function unwrapExchangeSecret(input: {
  vault: BlindBrainVaultState
  keyRef: string
  passphrase: string
}): BlindBrainResult<{ plaintext: string; keyRef: ExchangeKeyRef }> {
  if (input.vault.killSwitchArmed) {
    return {
      ok: false,
      code: 'kill_switch_armed',
      message: 'Blind Brain kill-switch armed — unwrap rejected',
    }
  }
  if (!isOpaqueExchangeKeyRef(input.keyRef)) {
    return { ok: false, code: 'invalid_ref', message: 'keyRef must be local:blind-brain:*' }
  }
  if (!input.passphrase || input.passphrase.length < 12) {
    return { ok: false, code: 'invalid_passphrase', message: 'passphrase required for unwrap' }
  }

  const entry = input.vault.entries.get(input.keyRef)
  if (!entry) {
    return { ok: false, code: 'entry_not_found', message: 'sealed entry not found in local vault' }
  }

  try {
    const salt = Buffer.from(entry.saltB64, 'base64')
    const key = deriveWrapKey(input.passphrase, salt)
    const iv = Buffer.from(entry.ivB64, 'base64')
    const tag = Buffer.from(entry.tagB64, 'base64')
    const ciphertext = Buffer.from(entry.ciphertextB64, 'base64')
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    return { ok: true, value: { plaintext, keyRef: entry.keyRef } }
  } catch {
    return {
      ok: false,
      code: 'auth_tag_mismatch',
      message: 'unwrap failed — wrong passphrase or tampered ciphertext',
    }
  }
}

/**
 * Fail-closed: sealed entry may be mirrored as opaque metadata, never with ciphertext→platform claim of HSM.
 * Rejects any attempt to mark production custody or push raw secret fields.
 */
export function assertSealedEntrySafeForPlatformMirror(
  entry: BlindBrainSealedEntry,
  platformRecord?: Record<string, unknown>,
): BlindBrainResult<{ mirrorSafe: true; hsmReady: false; productionCustodyReady: false }> {
  if (platformRecord) {
    for (const [k, v] of Object.entries(platformRecord)) {
      if (
        /secret|private_key|api_secret|exchange_secret/i.test(k) ||
        (typeof v === 'string' && looksLikeRawSecret(v) && !isOpaqueExchangeKeyRef(v))
      ) {
        return {
          ok: false,
          code: 'platform_persist_forbidden',
          message: `platform mirror must not contain raw secret field/value (${k})`,
        }
      }
    }
  }
  if (!isOpaqueExchangeKeyRef(entry.keyRef)) {
    return { ok: false, code: 'invalid_ref', message: 'mirror requires opaque keyRef' }
  }
  // Explicit honesty: this vault is software AES, not HSM.
  return {
    ok: true,
    value: {
      mirrorSafe: true,
      hsmReady: false,
      productionCustodyReady: false,
    },
  }
}

export function claimProductionCustody(_vault: BlindBrainVaultState): BlindBrainResult<never> {
  return {
    ok: false,
    code: 'production_custody_held',
    message: 'production Blind Brain custody requires HSM soak — productionCustodyReady stays false',
  }
}

export function claimHsmReady(_vault: BlindBrainVaultState): BlindBrainResult<never> {
  return {
    ok: false,
    code: 'hsm_unavailable',
    message: 'HSM not wired — hsmReady stays false',
  }
}

export function probeBlindBrainVaultReadiness(): {
  id: 'SF6'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  hsmReady: false
  productionCustodyReady: false
  investmentGrade: false
} {
  let vault = createBlindBrainVault()
  const sealed = sealExchangeSecret({
    vault,
    localHandle: 'sf6-probe-handle',
    plaintextSecret: 'exchange-test-secret-probe-only',
    passphrase: 'local-passphrase-sf6',
    now: '2026-08-10T12:00:00.000Z',
  })
  if (!sealed.ok) {
    return {
      id: 'SF6',
      status: 'NOT_IMPLEMENTED',
      ready: false,
      path: 'lib/server/quant/blind-brain-vault.ts',
      note: 'Blind Brain seal probe failed.',
      hsmReady: false,
      productionCustodyReady: false,
      investmentGrade: false,
    }
  }
  vault = sealed.value.vault
  const unwrapOk = unwrapExchangeSecret({
    vault,
    keyRef: sealed.value.entry.keyRef,
    passphrase: 'local-passphrase-sf6',
  })
  const unwrapBad = unwrapExchangeSecret({
    vault,
    keyRef: sealed.value.entry.keyRef,
    passphrase: 'wrong-passphrase!!!!',
  })
  vault = armBlindBrainKillSwitch(vault)
  const killBlocks = unwrapExchangeSecret({
    vault,
    keyRef: sealed.value.entry.keyRef,
    passphrase: 'local-passphrase-sf6',
  })
  const hsmClaim = claimHsmReady(vault)
  const prodClaim = claimProductionCustody(vault)
  const mirror = assertSealedEntrySafeForPlatformMirror(sealed.value.entry, {
    exchangeKeyRef: sealed.value.entry.keyRef,
  })

  const ready =
    unwrapOk.ok &&
    unwrapOk.value.plaintext === 'exchange-test-secret-probe-only' &&
    !unwrapBad.ok &&
    unwrapBad.code === 'auth_tag_mismatch' &&
    !killBlocks.ok &&
    killBlocks.code === 'kill_switch_armed' &&
    !hsmClaim.ok &&
    !prodClaim.ok &&
    mirror.ok &&
    vault.hsmReady === false &&
    vault.productionCustodyReady === false &&
    vault.investmentGrade === false

  return {
    id: 'SF6',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/blind-brain-vault.ts',
    note: ready
      ? 'AES-256-GCM local wrap/unwrap + kill-switch; opaque refs; HSM/production custody HELD — investmentGrade false.'
      : 'Blind Brain vault probe failed.',
    hsmReady: false,
    productionCustodyReady: false,
    investmentGrade: false,
  }
}
