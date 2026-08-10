/**
 * Law XV — baked-lighting publish gate (hardened fail-closed).
 *
 * Web-static success/pack artifacts require a non-theater bake receipt + positive lightmap bytes.
 * Never invent bake evidence; refuse pack when gate fails.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('baked-lighting-publish-gate')

export type PublishBakeTarget = 'web-static' | 'native-tauri' | 'demo-web-slice'

/** Receipt strings that look like placeholders — always refuse. */
const THEATER_RECEIPT_RE =
  /^(mock|fake|todo|tbd|placeholder|pending|n\/a|none|null|undefined|invent|example)([:_-].*)?$/i

export type BakedLightingGateRejectCode =
  | 'missing_receipt'
  | 'missing_lightmap_bytes'
  | 'theater_receipt'
  | 'receipt_too_short'
  | 'lightmap_hash_mismatch'
  | 'pack_refused_without_bake'

export type BakedLightingPublishGateResult = {
  allowed: boolean
  stageId: 'baked-lighting'
  reason: string
  shipStatus: 'IMPLEMENTED' | 'PARTIAL' | 'HELD'
  rejectCode?: BakedLightingGateRejectCode
  evidenceFingerprint: string | null
}

export function isTheaterBakeReceipt(ref: string | null | undefined): boolean {
  const trimmed = ref?.trim() ?? ''
  if (!trimmed) return true
  if (THEATER_RECEIPT_RE.test(trimmed)) return true
  if (/^bake:(mock|fake|todo|pending)\b/i.test(trimmed)) return true
  return false
}

function fingerprintEvidence(receipt: string, lightmapBytes: number, contentHash?: string): string {
  return createHash('sha256')
    .update([receipt.trim(), String(lightmapBytes), contentHash?.trim() ?? ''].join('|'))
    .digest('hex')
    .slice(0, 16)
}

/**
 * Harden Law XV bake gate for publish / Instant Play / pack.
 */
export function evaluateBakedLightingPublishGate(input: {
  target: PublishBakeTarget
  bakeReceiptRef?: string | null
  lightmapBytes?: number | null
  /** Optional SHA-256 (or truncated) of lightmap payload — when provided must be non-empty. */
  lightmapContentHash?: string | null
}): BakedLightingPublishGateResult {
  if (input.target === 'native-tauri') {
    return {
      allowed: true,
      stageId: 'baked-lighting',
      reason: 'Native tauri may defer bake to desktop cooker — receipt optional for plan stage.',
      shipStatus: 'PARTIAL',
      evidenceFingerprint: null,
    }
  }

  const receipt = input.bakeReceiptRef?.trim() ?? ''
  const bytes =
    typeof input.lightmapBytes === 'number' && Number.isFinite(input.lightmapBytes)
      ? Math.floor(input.lightmapBytes)
      : 0

  if (!receipt) {
    const result: BakedLightingPublishGateResult = {
      allowed: false,
      stageId: 'baked-lighting',
      reason: 'web-static publish blocked — missing baked-lighting receipt/lightmap (Law XV).',
      shipStatus: 'HELD',
      rejectCode: 'missing_receipt',
      evidenceFingerprint: null,
    }
    log.warn('baked_lighting_gate_blocked', { code: result.rejectCode, target: input.target })
    return result
  }

  if (isTheaterBakeReceipt(receipt)) {
    const result: BakedLightingPublishGateResult = {
      allowed: false,
      stageId: 'baked-lighting',
      reason: 'web-static publish blocked — theater/placeholder bake receipt refused (Law XV).',
      shipStatus: 'HELD',
      rejectCode: 'theater_receipt',
      evidenceFingerprint: null,
    }
    log.warn('baked_lighting_gate_blocked', { code: result.rejectCode, receipt })
    return result
  }

  if (receipt.length < 8) {
    return {
      allowed: false,
      stageId: 'baked-lighting',
      reason: 'web-static publish blocked — bake receipt too short to be evidence (Law XV).',
      shipStatus: 'HELD',
      rejectCode: 'receipt_too_short',
      evidenceFingerprint: null,
    }
  }

  if (bytes <= 0) {
    return {
      allowed: false,
      stageId: 'baked-lighting',
      reason: 'web-static publish blocked — missing baked-lighting receipt/lightmap (Law XV).',
      shipStatus: 'HELD',
      rejectCode: 'missing_lightmap_bytes',
      evidenceFingerprint: null,
    }
  }

  const hash = input.lightmapContentHash?.trim() ?? ''
  if (input.lightmapContentHash != null && input.lightmapContentHash !== undefined) {
    if (!hash || hash.length < 8 || /^(mock|fake|todo)$/i.test(hash)) {
      return {
        allowed: false,
        stageId: 'baked-lighting',
        reason: 'web-static publish blocked — lightmap content hash missing or theater (Law XV).',
        shipStatus: 'HELD',
        rejectCode: 'lightmap_hash_mismatch',
        evidenceFingerprint: null,
      }
    }
  }

  const evidenceFingerprint = fingerprintEvidence(receipt, bytes, hash || undefined)
  log.info('baked_lighting_gate_pass', {
    target: input.target,
    bytes,
    fingerprint: evidenceFingerprint,
  })

  return {
    allowed: true,
    stageId: 'baked-lighting',
    reason: 'Bake receipt + lightmap bytes present.',
    shipStatus: 'IMPLEMENTED',
    evidenceFingerprint,
  }
}

/**
 * Refuse packaging an AethelPack / export zip as success when bake gate fails.
 */
export function refusePackWithoutBakeEvidence(input: {
  target: PublishBakeTarget
  bakeReceiptRef?: string | null
  lightmapBytes?: number | null
  lightmapContentHash?: string | null
  packByteLength?: number | null
}): {
  ok: false
  code: BakedLightingGateRejectCode
  message: string
  gate: BakedLightingPublishGateResult
  packByteLength: number
} | {
  ok: true
  gate: BakedLightingPublishGateResult
  packByteLength: number
} {
  const gate = evaluateBakedLightingPublishGate(input)
  const packByteLength =
    typeof input.packByteLength === 'number' && input.packByteLength > 0
      ? Math.floor(input.packByteLength)
      : 0

  if (!gate.allowed) {
    return {
      ok: false,
      code: gate.rejectCode ?? 'pack_refused_without_bake',
      message: `Pack refused — ${gate.reason}`,
      gate,
      packByteLength: 0,
    }
  }

  // Even with bake PASS, empty pack bytes are not a success artifact (Law XVI).
  if (packByteLength <= 0) {
    return {
      ok: false,
      code: 'pack_refused_without_bake',
      message: 'Pack refused — bake PASS but pack bytes empty (Law XVI no empty success).',
      gate: {
        ...gate,
        allowed: false,
        shipStatus: 'HELD',
        reason: 'Bake evidence present but pack bytes empty — refuse success artifact.',
        rejectCode: 'pack_refused_without_bake',
      },
      packByteLength: 0,
    }
  }

  return { ok: true, gate, packByteLength }
}

export function probeBakedLightingPublishGateReadiness(): {
  id: 'LawXV-bake-gate'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
} {
  const pass = evaluateBakedLightingPublishGate({
    target: 'web-static',
    bakeReceiptRef: 'bake:probe:lightmap-v1',
    lightmapBytes: 2048,
    lightmapContentHash: 'sha256:probeabcdef12',
  })
  const theater = evaluateBakedLightingPublishGate({
    target: 'web-static',
    bakeReceiptRef: 'mock',
    lightmapBytes: 2048,
  })
  const missing = evaluateBakedLightingPublishGate({ target: 'web-static' })
  const packOk = refusePackWithoutBakeEvidence({
    target: 'web-static',
    bakeReceiptRef: 'bake:probe:lightmap-v1',
    lightmapBytes: 2048,
    packByteLength: 1024,
  })
  const packRefuse = refusePackWithoutBakeEvidence({
    target: 'web-static',
    bakeReceiptRef: 'pending',
    lightmapBytes: 2048,
    packByteLength: 9999,
  })

  const ready =
    pass.allowed &&
    pass.evidenceFingerprint != null &&
    !theater.allowed &&
    theater.rejectCode === 'theater_receipt' &&
    !missing.allowed &&
    packOk.ok &&
    !packRefuse.ok

  return {
    id: 'LawXV-bake-gate',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/production/baked-lighting-publish-gate.ts',
    note: ready
      ? 'Law XV bake gate refuses theater receipts + empty pack; web-static needs receipt+lightmap bytes.'
      : 'Baked-lighting publish gate probe failed.',
  }
}
