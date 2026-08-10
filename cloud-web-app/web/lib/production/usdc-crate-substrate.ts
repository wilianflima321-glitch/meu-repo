/**
 * J.7 / R8 — USDC (PXR-USDC) crate bootstrap + TOC directory substrate.
 *
 * Parses the fixed 88-byte crate header and TOC section names only.
 * Never decodes PATHS/SPECS/LZ4 into mesh geometry; never invents entities from
 * byte-length chunking; OpenUSD/Hydra mesh stage stays fail-closed.
 *
 * Layout (Pixar crate / public clean-room traces):
 *   0x00..0x08  magic "PXR-USDC"
 *   0x08..0x10  version major/minor/patch + 5 reserved zeros
 *   0x10..0x18  tocOffset int64 LE
 *   0x18..0x58  reserved
 *   TOC @ tocOffset: int64 sectionCount + N×{ name[16], offset i64, size i64 }
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { USDC_CRATE_MAGIC, isUsdcCrateBytes } from '@/lib/production/usd-stage-intake'

const log = createComponentLogger('usdc-crate-substrate')

export const USDC_BOOTSTRAP_BYTES = 88 as const
export const USDC_MESH_STAGE_READY = false as const
export const OPEN_USD_CRATE_MESH_READY = false as const
export const USDC_CRATE_MARKETING_ALLOWED = false as const

export type UsdcCrateRejectCode =
  | 'empty_payload'
  | 'invalid_magic'
  | 'header_too_short'
  | 'corrupt_version'
  | 'corrupt_toc'
  | 'mesh_stage_claim_held'
  | 'marketing_leak'

export type UsdcCrateResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: UsdcCrateRejectCode; message: string }

export type UsdcCrateVersion = { major: number; minor: number; patch: number }

export type UsdcTocSection = {
  name: string
  offset: number
  size: number
}

export type UsdcCrateHeaderReceipt = {
  version: 1
  magicOk: true
  crateVersion: UsdcCrateVersion
  tocOffset: number
  sectionCount: number
  sections: UsdcTocSection[]
  byteLength: number
  fingerprint: string
  /** Never true without full OpenUSD SPECS/PATHS decode + Hydra. */
  meshStageReady: false
  openUsdStageReady: false
  marketingAllowed: false
  shipStatus: 'PARTIAL'
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function readI64Le(view: DataView, offset: number): number | null {
  if (offset + 8 > view.byteLength) return null
  // BigInt → Number; crate files in practice stay within safe integer range for TOC.
  const lo = view.getUint32(offset, true)
  const hi = view.getUint32(offset + 4, true)
  if (hi > 0xffff) return null // refuse absurd TOC offsets
  return hi * 0x1_0000_0000 + lo
}

function readSectionName(bytes: Uint8Array, offset: number): string | null {
  if (offset + 16 > bytes.length) return null
  let end = offset
  while (end < offset + 16 && bytes[end] !== 0) end += 1
  const raw = Buffer.from(bytes.subarray(offset, end)).toString('ascii')
  if (!/^[A-Za-z0-9_]+$/.test(raw)) return null
  return raw
}

/**
 * Parse USDC bootstrap header + TOC directory (section names/offsets/sizes only).
 */
export function parseUsdcCrateHeader(payload: Uint8Array): UsdcCrateResult<{
  crateVersion: UsdcCrateVersion
  tocOffset: number
  sections: UsdcTocSection[]
}> {
  if (!(payload instanceof Uint8Array) || payload.byteLength === 0) {
    return { ok: false, code: 'empty_payload', message: 'USDC payload empty' }
  }
  if (!isUsdcCrateBytes(payload)) {
    return { ok: false, code: 'invalid_magic', message: 'USDC magic mismatch (expected PXR-USDC)' }
  }
  if (payload.byteLength < USDC_BOOTSTRAP_BYTES) {
    return {
      ok: false,
      code: 'header_too_short',
      message: `USDC bootstrap requires ${USDC_BOOTSTRAP_BYTES} bytes (got ${payload.byteLength})`,
    }
  }

  const major = payload[8]!
  const minor = payload[9]!
  const patch = payload[10]!
  for (let i = 11; i < 16; i++) {
    if (payload[i] !== 0) {
      return {
        ok: false,
        code: 'corrupt_version',
        message: 'USDC version reserved bytes must be zero',
      }
    }
  }
  // Observed real crates use 0.x.y (e.g. 0.8.0); refuse absurd majors.
  if (major > 2) {
    return {
      ok: false,
      code: 'corrupt_version',
      message: `USDC major version unsupported: ${major}`,
    }
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  const tocOffset = readI64Le(view, 0x10)
  if (tocOffset === null || tocOffset < USDC_BOOTSTRAP_BYTES || tocOffset >= payload.byteLength) {
    return {
      ok: false,
      code: 'corrupt_toc',
      message: 'USDC tocOffset out of range or unreadable',
    }
  }

  const sectionCount = readI64Le(view, tocOffset)
  if (sectionCount === null || sectionCount < 0 || sectionCount > 64) {
    return {
      ok: false,
      code: 'corrupt_toc',
      message: 'USDC TOC sectionCount corrupt or exceeds safety cap',
    }
  }

  const sections: UsdcTocSection[] = []
  let cursor = tocOffset + 8
  for (let i = 0; i < sectionCount; i++) {
    const name = readSectionName(payload, cursor)
    const offset = readI64Le(view, cursor + 16)
    const size = readI64Le(view, cursor + 24)
    if (!name || offset === null || size === null || offset < 0 || size < 0) {
      return {
        ok: false,
        code: 'corrupt_toc',
        message: `USDC TOC section ${i} corrupt`,
      }
    }
    if (offset + size > payload.byteLength) {
      return {
        ok: false,
        code: 'corrupt_toc',
        message: `USDC TOC section "${name}" payload exceeds file length`,
      }
    }
    sections.push({ name, offset, size })
    cursor += 32
  }

  return {
    ok: true,
    value: {
      crateVersion: { major, minor, patch },
      tocOffset,
      sections,
    },
  }
}

export function sealUsdcCrateHeaderReceipt(payload: Uint8Array): UsdcCrateResult<UsdcCrateHeaderReceipt> {
  if (USDC_MESH_STAGE_READY || OPEN_USD_CRATE_MESH_READY || USDC_CRATE_MARKETING_ALLOWED) {
    return {
      ok: false,
      code: 'marketing_leak',
      message: 'USDC mesh/marketing flags must remain false',
    }
  }

  const parsed = parseUsdcCrateHeader(payload)
  if (!parsed.ok) return parsed

  const { crateVersion, tocOffset, sections } = parsed.value
  const fp = fingerprint([
    'usdc-crate-v1',
    `${crateVersion.major}.${crateVersion.minor}.${crateVersion.patch}`,
    String(tocOffset),
    String(sections.length),
    sections.map((s) => `${s.name}:${s.offset}:${s.size}`).join(','),
    String(payload.byteLength),
  ])

  log.info('usdc_crate_header_sealed', {
    fingerprint: fp,
    sectionCount: sections.length,
    meshStageReady: false,
  })

  return {
    ok: true,
    value: {
      version: 1,
      magicOk: true,
      crateVersion,
      tocOffset,
      sectionCount: sections.length,
      sections,
      byteLength: payload.byteLength,
      fingerprint: fp,
      meshStageReady: false,
      openUsdStageReady: false,
      marketingAllowed: false,
      shipStatus: 'PARTIAL',
    },
  }
}

/**
 * Fail-closed mesh-stage claim — header may seal; mesh never ships from this substrate.
 */
export function refuseUsdcMeshStageClaim(input: {
  claimMeshStage?: boolean
  claimOpenUsdStage?: boolean
  bytes?: Uint8Array
}):
  | { ok: true; receipt: UsdcCrateHeaderReceipt | null; meshStageReady: false }
  | { ok: false; code: UsdcCrateRejectCode; message: string } {
  if (input.claimMeshStage === true || input.claimOpenUsdStage === true) {
    return {
      ok: false,
      code: 'mesh_stage_claim_held',
      message: 'USDC/OpenUSD mesh stage claim refused — TOC directory only; Hydra HELD',
    }
  }

  if (!input.bytes) {
    return { ok: true, receipt: null, meshStageReady: false }
  }

  const sealed = sealUsdcCrateHeaderReceipt(input.bytes)
  if (!sealed.ok) {
    return { ok: false, code: sealed.code, message: sealed.message }
  }
  return { ok: true, receipt: sealed.value, meshStageReady: false }
}

/**
 * Minimal valid USDC bootstrap + empty TOC for tests (88+8 bytes).
 * Not a shippable mesh crate — header/TOC honesty fixture only.
 */
export function buildUsdcCrateHeaderFixture(input?: {
  major?: number
  minor?: number
  patch?: number
  sections?: Array<{ name: string; offset: number; size: number }>
}): Uint8Array {
  const sections = input?.sections ?? []
  const tocOffset = USDC_BOOTSTRAP_BYTES
  const tocBytes = 8 + sections.length * 32
  const out = new Uint8Array(USDC_BOOTSTRAP_BYTES + tocBytes)
  out.set(USDC_CRATE_MAGIC, 0)
  out[8] = input?.major ?? 0
  out[9] = input?.minor ?? 8
  out[10] = input?.patch ?? 0
  const view = new DataView(out.buffer)
  view.setUint32(0x10, tocOffset, true)
  view.setUint32(0x14, 0, true)
  view.setUint32(tocOffset, sections.length, true)
  view.setUint32(tocOffset + 4, 0, true)
  let cursor = tocOffset + 8
  for (const section of sections) {
    const nameBytes = Buffer.from(section.name, 'ascii')
    out.set(nameBytes.subarray(0, Math.min(15, nameBytes.length)), cursor)
    view.setUint32(cursor + 16, section.offset, true)
    view.setUint32(cursor + 20, 0, true)
    view.setUint32(cursor + 24, section.size, true)
    view.setUint32(cursor + 28, 0, true)
    cursor += 32
  }
  return out
}
