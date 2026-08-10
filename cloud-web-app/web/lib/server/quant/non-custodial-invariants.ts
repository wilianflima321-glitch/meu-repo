/**
 * §23.B / N1 deepen — Non-custodial invariant checks.
 * Platform DB must never persist exchange API secrets. Local Blind Brain only.
 * Distinct from Law XVI BYOK (LLM keys) and Hub Coins (H.0 HELD).
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('quant-non-custodial')

/** Opaque local-only ref — never the raw secret. */
export type ExchangeKeyRef = `local:blind-brain:${string}`

export type NonCustodialRejectCode =
  | 'exchange_secret_in_platform_db'
  | 'raw_secret_field_forbidden'
  | 'byok_llm_key_as_exchange'
  | 'hub_coins_as_custody'
  | 'invalid_key_ref'

export type NonCustodialResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: NonCustodialRejectCode; message: string }

/** Patterns that look like raw exchange API secrets / credentials. */
const RAW_SECRET_FIELD_NAMES = new Set([
  'apiSecret',
  'api_secret',
  'exchangeSecret',
  'exchange_secret',
  'binanceSecret',
  'binance_secret',
  'secretKey',
  'secret_key',
  'privateKey',
  'private_key',
])

const LOOKS_LIKE_RAW_SECRET = /^(?:[A-Za-z0-9+/]{32,}={0,2}|[0-9a-fA-F]{40,})$/

export function isOpaqueExchangeKeyRef(value: string | null | undefined): value is ExchangeKeyRef {
  if (!value) return false
  return /^local:blind-brain:[a-zA-Z0-9_-]{8,128}$/.test(value)
}

export function mintLocalExchangeKeyRef(localHandle: string): NonCustodialResult<ExchangeKeyRef> {
  const trimmed = localHandle.trim()
  if (!trimmed || LOOKS_LIKE_RAW_SECRET.test(trimmed)) {
    return {
      ok: false,
      code: 'invalid_key_ref',
      message: 'key ref must be a local opaque handle, not a raw secret',
    }
  }
  const digest = createHash('sha256').update(`blind-brain|${trimmed}`).digest('hex').slice(0, 24)
  return { ok: true, value: `local:blind-brain:${digest}` }
}

/**
 * Fail-closed scan of a platform-persisted record.
 * Rejects raw secret fields and values that look like exchange credentials.
 */
export function assertNoExchangeSecretInPlatformRecord(
  record: Record<string, unknown>,
): NonCustodialResult<{ nonCustodial: true }> {
  for (const [key, value] of Object.entries(record)) {
    if (RAW_SECRET_FIELD_NAMES.has(key)) {
      log.warn('non_custodial_reject_raw_field', { field: key })
      return {
        ok: false,
        code: 'raw_secret_field_forbidden',
        message: `platform record must not contain field ${key}`,
      }
    }
    if (typeof value === 'string' && LOOKS_LIKE_RAW_SECRET.test(value) && !isOpaqueExchangeKeyRef(value)) {
      log.warn('non_custodial_reject_raw_value', { field: key })
      return {
        ok: false,
        code: 'exchange_secret_in_platform_db',
        message: `field ${key} looks like a raw exchange secret — store local Blind Brain ref only`,
      }
    }
    if (key === 'exchangeKeyRef' && value != null && typeof value === 'string' && !isOpaqueExchangeKeyRef(value)) {
      return {
        ok: false,
        code: 'invalid_key_ref',
        message: 'exchangeKeyRef must be local:blind-brain:* opaque ref',
      }
    }
  }
  return { ok: true, value: { nonCustodial: true } }
}

/** Law XVI BYOK LLM keys must never be treated as exchange custody material. */
export function assertNotLlmByokAsExchange(
  kind: 'llm_byok' | 'exchange_local' | 'hub_coins',
): NonCustodialResult<{ kind: 'exchange_local' }> {
  if (kind === 'llm_byok') {
    return {
      ok: false,
      code: 'byok_llm_key_as_exchange',
      message: 'Law XVI AI BYOK keys are not exchange API secrets',
    }
  }
  if (kind === 'hub_coins') {
    return {
      ok: false,
      code: 'hub_coins_as_custody',
      message: 'Hub Aethel Coins (H.0 HELD) are not exchange custody',
    }
  }
  return { ok: true, value: { kind: 'exchange_local' } }
}

export function probeNonCustodialReadiness(): {
  ready: boolean
  status: 'PARTIAL'
  path: string
  note: string
} {
  const good = assertNoExchangeSecretInPlatformRecord({
    accountId: 'acct_probe',
    exchangeKeyRef: 'local:blind-brain:deadbeefcafebabe01234567',
  })
  const bad = assertNoExchangeSecretInPlatformRecord({
    apiSecret: 'abcdefghijklmnopqrstuvwxyz0123456789ABCD',
  })
  const ready = good.ok === true && bad.ok === false
  return {
    ready,
    status: 'PARTIAL',
    path: 'lib/server/quant/non-custodial-invariants.ts',
    note: ready
      ? 'Platform DB reject of raw exchange secrets wired — Blind Brain vault still HELD.'
      : 'Non-custodial invariant probe failed.',
  }
}
