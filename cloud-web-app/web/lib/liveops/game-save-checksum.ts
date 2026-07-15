/**
 * F.1 — GameSave checksum helpers (pure; Node crypto on server, Web Crypto-compatible digests).
 * Canonical JSON → SHA-256 hex. Client SaveManager may keep its local hash; durable authority uses this.
 */

import { createHash } from 'node:crypto'

/** Stable stringify: sorted object keys, arrays preserve order. */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value))
}

function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortKeysDeep(obj[key])
  }
  return out
}

/** SHA-256 hex of canonical payload JSON. */
export function computeGameSaveChecksum(payload: unknown): string {
  const body = canonicalJsonStringify(payload)
  return createHash('sha256').update(body, 'utf8').digest('hex')
}

export function verifyGameSaveChecksum(
  payload: unknown,
  expectedChecksum: string,
): boolean {
  const expected = String(expectedChecksum || '')
    .trim()
    .toLowerCase()
  if (!expected) return false
  return computeGameSaveChecksum(payload) === expected
}
