/**
 * Honesty Matrix #7 — J.7 refined GLB → cook receipt (USDZ preview pack optional).
 *
 * Real cook from refined mesh bytes. Never: empty success, capsule character,
 * Meshy/Tripo surpass, or OpenUSD/Hydra stage claim. USDA/USDC mesh stage HELD.
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  USD_BROWSER_VIEWER_SHIP_STATUS,
  USD_INTEGRATOR_HONESTY,
  evaluateUsdCharacterShipGate,
  evaluateUsdzPreviewEligibility,
  type UsdShipKind,
} from '@/lib/production/usd-integrator'

const log = createComponentLogger('usd-refined-mesh-cook')

/** OpenUSD C++ / Hydra stage — always false until Founder unlock. */
export const OPEN_USD_COOK_STAGE_READY = false as const
/** Meshy/Tripo clay surpass marketing — always false. */
export const MESH_CLAY_SURPASS_CLAIM = false as const
/** Product GLB→USDC crate mesh cook — HELD. */
export const USDC_MESH_COOK_READY = false as const

const GLB_MAGIC = 0x46546c67 // 'glTF' LE

export type RefinedMeshCookRejectCode =
  | 'empty_payload'
  | 'not_glb'
  | 'glb_truncated'
  | 'empty_cook_artifact'
  | 'proxy_capsule_forbidden'
  | 'character_gate_denied'
  | 'openusd_stage_held'
  | 'usdc_mesh_cook_held'

export type RefinedMeshCookReceipt = {
  cookId: string
  sourceFormat: 'glb'
  /** Viewport-eligible pack — USDZ ZIP preview only, not OpenUSD stage. */
  outputFormat: 'glb' | 'usdz_preview_pack'
  contentFingerprint: string
  byteLength: number
  glbVersion: number
  declaredLength: number
  /** Honest triangle hint from chunk sizes — not a Meshy quality claim. */
  triangleBudgetHint: number
  viewerShipStatus: typeof USD_BROWSER_VIEWER_SHIP_STATUS
  openUsdStageReady: false
  usdcMeshCookReady: false
  meshClaySurpassClaim: false
  usdzPreviewEligible: boolean
  honesty: typeof USD_INTEGRATOR_HONESTY
}

export type RefinedMeshCookResult =
  | {
      success: true
      receipt: RefinedMeshCookReceipt
      /** Present when packUsdzPreview requested and ZIP sealed. */
      usdzBytes: Uint8Array | null
      message: string
    }
  | {
      success: false
      code: RefinedMeshCookRejectCode
      receipt: null
      usdzBytes: null
      message: string
    }

function fingerprintBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 32)
}

function readU32LE(view: Uint8Array, offset: number): number {
  return (
    view[offset]! |
    (view[offset + 1]! << 8) |
    (view[offset + 2]! << 16) |
    (view[offset + 3]! << 24)
  ) >>> 0
}

/**
 * Minimal GLB header probe — magic + version + length (no full mesh parse).
 */
export function probeGlbHeader(bytes: Uint8Array): {
  ok: true
  version: number
  declaredLength: number
} | {
  ok: false
  code: 'empty_payload' | 'not_glb' | 'glb_truncated'
  message: string
} {
  if (bytes.byteLength === 0) {
    return { ok: false, code: 'empty_payload', message: 'Refined mesh cook denied — empty GLB (Law XVI).' }
  }
  if (bytes.byteLength < 12) {
    return { ok: false, code: 'not_glb', message: 'Refined mesh cook denied — GLB header truncated.' }
  }
  const magic = readU32LE(bytes, 0)
  if (magic !== GLB_MAGIC) {
    return { ok: false, code: 'not_glb', message: 'Refined mesh cook denied — not a glTF binary (GLB).' }
  }
  const version = readU32LE(bytes, 4)
  const declaredLength = readU32LE(bytes, 8)
  if (declaredLength < 12 || declaredLength > bytes.byteLength) {
    return {
      ok: false,
      code: 'glb_truncated',
      message: 'Refined mesh cook denied — GLB declared length inconsistent with buffer.',
    }
  }
  if (version !== 2) {
    return {
      ok: false,
      code: 'glb_truncated',
      message: `Refined mesh cook denied — unsupported GLB version ${version} (expect 2).`,
    }
  }
  return { ok: true, version, declaredLength }
}

/**
 * Build a minimal ZIP (USDZ container) that embeds the refined GLB.
 * Eligibility for Three USDZLoader ZIP magic only — not OpenUSD mesh stage.
 */
export function packGlbIntoUsdzPreviewZip(glbBytes: Uint8Array, entryName = 'refined.glb'): Uint8Array {
  const nameBytes = new TextEncoder().encode(entryName)
  const localHeaderSize = 30 + nameBytes.length
  const centralHeaderSize = 46 + nameBytes.length
  const endSize = 22
  const out = new Uint8Array(localHeaderSize + glbBytes.length + centralHeaderSize + endSize)
  let o = 0

  // Local file header
  out[o++] = 0x50; out[o++] = 0x4b; out[o++] = 0x03; out[o++] = 0x04
  out[o++] = 20; out[o++] = 0 // version needed
  out[o++] = 0; out[o++] = 0 // flags
  out[o++] = 0; out[o++] = 0 // method store
  out[o++] = 0; out[o++] = 0; out[o++] = 0; out[o++] = 0 // time/date
  const crc = crc32(glbBytes)
  writeU32(out, o, crc); o += 4
  writeU32(out, o, glbBytes.length); o += 4
  writeU32(out, o, glbBytes.length); o += 4
  writeU16(out, o, nameBytes.length); o += 2
  writeU16(out, o, 0); o += 2 // extra
  out.set(nameBytes, o); o += nameBytes.length
  out.set(glbBytes, o); o += glbBytes.length
  const localOffset = 0

  // Central directory
  const centralOffset = o
  out[o++] = 0x50; out[o++] = 0x4b; out[o++] = 0x01; out[o++] = 0x02
  out[o++] = 20; out[o++] = 0; out[o++] = 20; out[o++] = 0
  out[o++] = 0; out[o++] = 0; out[o++] = 0; out[o++] = 0
  out[o++] = 0; out[o++] = 0; out[o++] = 0; out[o++] = 0
  writeU32(out, o, crc); o += 4
  writeU32(out, o, glbBytes.length); o += 4
  writeU32(out, o, glbBytes.length); o += 4
  writeU16(out, o, nameBytes.length); o += 2
  writeU16(out, o, 0); o += 2
  writeU16(out, o, 0); o += 2
  writeU16(out, o, 0); o += 2
  writeU16(out, o, 0); o += 2
  writeU32(out, o, 0); o += 4
  writeU32(out, o, localOffset); o += 4
  out.set(nameBytes, o); o += nameBytes.length

  // End of central directory
  out[o++] = 0x50; out[o++] = 0x4b; out[o++] = 0x05; out[o++] = 0x06
  out[o++] = 0; out[o++] = 0; out[o++] = 0; out[o++] = 0
  writeU16(out, o, 1); o += 2
  writeU16(out, o, 1); o += 2
  writeU32(out, o, centralHeaderSize); o += 4
  writeU32(out, o, centralOffset); o += 4
  writeU16(out, o, 0); o += 2

  return out.subarray(0, o)
}

function writeU16(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >> 8) & 0xff
}

function writeU32(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >> 8) & 0xff
  buf[offset + 2] = (value >> 16) & 0xff
  buf[offset + 3] = (value >> 24) & 0xff
}

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    c ^= data[i]!
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    }
  }
  return (c ^ 0xffffffff) >>> 0
}

/**
 * Cook a refined GLB into an honest J.7 receipt (+ optional USDZ preview ZIP).
 */
export function cookRefinedMeshToUsdPreview(input: {
  glbBytes: ArrayBuffer | Uint8Array
  shipKind?: UsdShipKind
  geometryProxy?: 'capsule' | 'box' | 'sphere' | 'none'
  claimOpenUsdStage?: boolean
  claimUsdcMeshCook?: boolean
  packUsdzPreview?: boolean
  /** Optional budget stamp — fail-closed if ≤0 when provided. */
  triangleBudgetHint?: number
}): RefinedMeshCookResult {
  const bytes = input.glbBytes instanceof Uint8Array ? input.glbBytes : new Uint8Array(input.glbBytes)

  if (input.claimOpenUsdStage === true) {
    log.warn('refined_mesh_cook_openusd_blocked')
    return {
      success: false,
      code: 'openusd_stage_held',
      receipt: null,
      usdzBytes: null,
      message: 'OpenUSD/Hydra stage cook HELD — refuse theater claim.',
    }
  }
  if (input.claimUsdcMeshCook === true) {
    return {
      success: false,
      code: 'usdc_mesh_cook_held',
      receipt: null,
      usdzBytes: null,
      message: 'USDC crate mesh cook HELD — GLB/USDZ preview pack only.',
    }
  }

  const gate = evaluateUsdCharacterShipGate({
    shipKind: input.shipKind ?? 'prop',
    geometryProxy: input.geometryProxy ?? 'none',
  })
  if (!gate.allowed) {
    return {
      success: false,
      code: gate.reason === 'proxy_capsule_forbidden' ? 'proxy_capsule_forbidden' : 'character_gate_denied',
      receipt: null,
      usdzBytes: null,
      message: gate.message,
    }
  }

  const header = probeGlbHeader(bytes)
  if (!header.ok) {
    return {
      success: false,
      code: header.code,
      receipt: null,
      usdzBytes: null,
      message: header.message,
    }
  }

  const fp = fingerprintBytes(bytes)
  if (!fp) {
    return {
      success: false,
      code: 'empty_cook_artifact',
      receipt: null,
      usdzBytes: null,
      message: 'Law XVI: refuse empty cook fingerprint.',
    }
  }

  const triangleBudgetHint =
    typeof input.triangleBudgetHint === 'number'
      ? Math.floor(input.triangleBudgetHint)
      : Math.max(1, Math.floor(header.declaredLength / 96))

  if (triangleBudgetHint <= 0) {
    return {
      success: false,
      code: 'empty_cook_artifact',
      receipt: null,
      usdzBytes: null,
      message: 'Refined mesh cook denied — non-positive triangle budget.',
    }
  }

  let usdzBytes: Uint8Array | null = null
  let usdzPreviewEligible = false
  let outputFormat: RefinedMeshCookReceipt['outputFormat'] = 'glb'

  if (input.packUsdzPreview) {
    usdzBytes = packGlbIntoUsdzPreviewZip(bytes)
    const eligibility = evaluateUsdzPreviewEligibility(usdzBytes)
    usdzPreviewEligible = eligibility.eligible
    if (!eligibility.eligible || usdzBytes.byteLength === 0) {
      return {
        success: false,
        code: 'empty_cook_artifact',
        receipt: null,
        usdzBytes: null,
        message: eligibility.message || 'USDZ preview pack seal failed (Law XVI).',
      }
    }
    outputFormat = 'usdz_preview_pack'
  }

  const receipt: RefinedMeshCookReceipt = {
    cookId: `j7-cook-${randomUUID().slice(0, 8)}`,
    sourceFormat: 'glb',
    outputFormat,
    contentFingerprint: fp,
    byteLength: bytes.byteLength,
    glbVersion: header.version,
    declaredLength: header.declaredLength,
    triangleBudgetHint,
    viewerShipStatus: USD_BROWSER_VIEWER_SHIP_STATUS,
    openUsdStageReady: OPEN_USD_COOK_STAGE_READY,
    usdcMeshCookReady: USDC_MESH_COOK_READY,
    meshClaySurpassClaim: MESH_CLAY_SURPASS_CLAIM,
    usdzPreviewEligible,
    honesty: USD_INTEGRATOR_HONESTY,
  }

  log.info('refined_mesh_cook_ok', {
    cookId: receipt.cookId,
    outputFormat: receipt.outputFormat,
    fingerprint: receipt.contentFingerprint,
  })

  return {
    success: true,
    receipt,
    usdzBytes,
    message:
      outputFormat === 'usdz_preview_pack'
        ? `Refined GLB cooked to USDZ preview pack — ${USD_INTEGRATOR_HONESTY.usdzPreviewPartial}`
        : `Refined GLB cook receipt sealed — browser viewer ${USD_BROWSER_VIEWER_SHIP_STATUS}; OpenUSD HELD.`,
  }
}
