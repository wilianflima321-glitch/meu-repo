/**
 * S7 / R17 — OpenVDB header substrate (web cook path).
 *
 * Validates ASWF `.vdb` magic + version; refuses Blosc/dense OOM and product volume claims.
 * Mirrors kernel `openvdb_bridge` fail-closed honesty without C++ OpenVDB / TBB / Blosc.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('openvdb-header-substrate')

/** Full OpenVDB sparse volume product / Lumen-VDB AAA — HELD. */
export const OPENVDB_PRODUCT_READY = false as const
export const OPENVDB_BLOSC_DECODE_READY = false as const
export const LUMEN_VDB_VOLUMETRIC_AAA_READY = false as const
export const OPENVDB_MARKETING_ALLOWED = false as const

/** Mirror kernel OOM guard (~50MB dense refuse). */
export const OPENVDB_MAX_PAYLOAD_BYTES = 50 * 1024 * 1024

export type OpenVdbRejectCode =
  | 'empty_payload'
  | 'invalid_magic'
  | 'unsupported_version'
  | 'grid_compressed_blosc'
  | 'sparse_leaf_held'
  | 'oom_protection'
  | 'product_claim_held'
  | 'marketing_leak'

export type OpenVdbResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: OpenVdbRejectCode; message: string }

export type OpenVdbHeaderInfo = {
  fileVersion: number
  byteLength: number
  sparseLeafIngestHeld: true
}

export type OpenVdbHeaderReceipt = {
  version: 1
  magicOk: true
  fileVersion: number
  byteLength: number
  fingerprint: string
  openVdbProductReady: false
  openVdbBloscDecodeReady: false
  lumenVdbVolumetricAaaReady: false
  marketingAllowed: false
  shipStatus: 'PARTIAL'
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function looksLikeBloscMarker(payload: Uint8Array): boolean {
  const limit = Math.min(payload.length, 4096)
  const ascii = Buffer.from(payload.subarray(0, limit)).toString('latin1').toLowerCase()
  return ascii.includes('blosc')
}

/**
 * Validate OpenVDB magic (`VDB `) + little-endian file version.
 * Body/sparse-leaf expand remains HELD — callers must not claim product volume cook.
 */
export function parseOpenVdbHeader(payload: Uint8Array): OpenVdbResult<OpenVdbHeaderInfo> {
  if (!(payload instanceof Uint8Array) || payload.byteLength < 8) {
    return { ok: false, code: 'empty_payload', message: 'OpenVDB payload missing or shorter than 8 bytes' }
  }

  const magicAscii = String.fromCharCode(payload[0]!, payload[1]!, payload[2]!, payload[3]!)
  const magicLe =
    payload[0] === 0x20 && payload[1] === 0x42 && payload[2] === 0x44 && payload[3] === 0x56
  if (magicAscii !== 'VDB ' && !magicLe) {
    return { ok: false, code: 'invalid_magic', message: 'OpenVDB magic mismatch (expected VDB )' }
  }

  const fileVersion =
    payload[4]! | (payload[5]! << 8) | (payload[6]! << 16) | (payload[7]! << 24)
  if (fileVersion > 224 || fileVersion < 1) {
    return { ok: false, code: 'unsupported_version', message: `OpenVDB version unsupported: ${fileVersion}` }
  }

  if (payload.byteLength > OPENVDB_MAX_PAYLOAD_BYTES) {
    return {
      ok: false,
      code: 'oom_protection',
      message: `OpenVDB payload exceeds ${OPENVDB_MAX_PAYLOAD_BYTES} byte cook guard`,
    }
  }

  if (payload.byteLength > 16 && looksLikeBloscMarker(payload)) {
    return {
      ok: false,
      code: 'grid_compressed_blosc',
      message: 'Blosc-compressed OpenVDB grids refused (no decode path)',
    }
  }

  return {
    ok: true,
    value: {
      fileVersion,
      byteLength: payload.byteLength,
      sparseLeafIngestHeld: true,
    },
  }
}

/**
 * Seal header-only cook evidence (≤16 bytes). Larger bodies parse but do not seal product.
 */
export function sealOpenVdbHeaderReceipt(payload: Uint8Array): OpenVdbResult<OpenVdbHeaderReceipt> {
  if (
    OPENVDB_PRODUCT_READY ||
    OPENVDB_BLOSC_DECODE_READY ||
    LUMEN_VDB_VOLUMETRIC_AAA_READY ||
    OPENVDB_MARKETING_ALLOWED
  ) {
    return {
      ok: false,
      code: 'marketing_leak',
      message: 'OpenVDB product/marketing flags must remain false',
    }
  }

  const parsed = parseOpenVdbHeader(payload)
  if (!parsed.ok) return parsed

  if (parsed.value.byteLength > 16) {
    return {
      ok: false,
      code: 'sparse_leaf_held',
      message: 'OpenVDB sparse leaf ingest HELD — seal only header-only fixtures (≤16 bytes)',
    }
  }

  const fp = fingerprint([
    'openvdb-hdr-v1',
    String(parsed.value.fileVersion),
    String(parsed.value.byteLength),
  ])
  log.info('openvdb_header_sealed', {
    fingerprint: fp,
    fileVersion: parsed.value.fileVersion,
    byteLength: parsed.value.byteLength,
    openVdbProductReady: false,
  })

  return {
    ok: true,
    value: {
      version: 1,
      magicOk: true,
      fileVersion: parsed.value.fileVersion,
      byteLength: parsed.value.byteLength,
      fingerprint: fp,
      openVdbProductReady: false,
      openVdbBloscDecodeReady: false,
      lumenVdbVolumetricAaaReady: false,
      marketingAllowed: false,
      shipStatus: 'PARTIAL',
    },
  }
}

/**
 * Publish refuse — product OpenVDB claim without a sealed header-only receipt.
 */
export function refusePackWithoutOpenVdbEvidence(input: {
  claimOpenVdbProductReady?: boolean
  volumeVdbPayloads?: Uint8Array[]
}):
  | { ok: true; receipts: OpenVdbHeaderReceipt[]; openVdbProductReady: false }
  | { ok: false; code: OpenVdbRejectCode; message: string } {
  if (input.claimOpenVdbProductReady === true) {
    return {
      ok: false,
      code: 'product_claim_held',
      message: 'OpenVDB product ready claim refused — sparse volume cook HELD',
    }
  }

  const payloads = input.volumeVdbPayloads ?? []
  const receipts: OpenVdbHeaderReceipt[] = []
  for (const payload of payloads) {
    const sealed = sealOpenVdbHeaderReceipt(payload)
    if (!sealed.ok) {
      return { ok: false, code: sealed.code, message: sealed.message }
    }
    receipts.push(sealed.value)
  }

  return { ok: true, receipts, openVdbProductReady: false }
}

/** Build a header-only VDB fixture (8 bytes) for cook tests. */
export function buildOpenVdbHeaderFixture(fileVersion = 224): Uint8Array {
  const out = new Uint8Array(8)
  out[0] = 0x56 // V
  out[1] = 0x44 // D
  out[2] = 0x42 // B
  out[3] = 0x20 // space
  out[4] = fileVersion & 0xff
  out[5] = (fileVersion >> 8) & 0xff
  out[6] = (fileVersion >> 16) & 0xff
  out[7] = (fileVersion >> 24) & 0xff
  return out
}
