/**
 * J.7 deepen — fail-closed USD stage compose from intake + hierarchy wireframe.
 *
 * Never: OpenUSD/Hydra claim, capsule-as-character, or success:true with empty artifact.
 * USDA → hierarchy boxes only; USDZ → ZIP preview eligibility only; USDC → HELD.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  evaluateUsdCharacterShipGate,
  type UsdBrowserFormatId,
  type UsdShipKind,
} from '@/lib/production/usd-integrator'
import {
  evaluateUsdStageIntake,
  type OpenUsdStageHeldReason,
  type UsdStageIntakeResult,
} from '@/lib/production/usd-stage-intake'
import {
  parseUsdaHierarchyPreview,
  type UsdaHierarchyBox,
  type UsdaHierarchyPreview,
} from '@/lib/viewport/usda-preview-hierarchy'

const log = createComponentLogger('usd-stage-compose')

export const OPEN_USD_STAGE_READY = false as const
export const USD_STAGE_COMPOSE_WIRED = true as const

export type UsdStageComposeRejectCode =
  | 'empty_payload'
  | 'empty_compose_artifact'
  | 'proxy_capsule_forbidden'
  | 'character_gate_denied'
  | 'openusd_stage_held'
  | 'hierarchy_parse_failed'
  | 'intake_held'

export type UsdStageComposeArtifact = {
  format: UsdBrowserFormatId
  primCount: number
  meshCount: number
  xformCount: number
  boxCount: number
  boxes: UsdaHierarchyBox[]
  hierarchySummary: string
  /** Preview kind — never solid mesh / capsule. */
  previewKind: 'hierarchy_wireframe_only' | 'usdz_zip_preview_only' | 'held'
  contentFingerprint: string
}

export type UsdStageComposeResult =
  | {
      success: true
      openUsdStageClaimable: false
      openUsdStageReady: false
      intake: UsdStageIntakeResult
      hierarchy: UsdaHierarchyPreview | null
      artifact: UsdStageComposeArtifact
      message: string
    }
  | {
      success: false
      openUsdStageClaimable: false
      openUsdStageReady: false
      code: UsdStageComposeRejectCode
      heldReason?: OpenUsdStageHeldReason
      intake: UsdStageIntakeResult | null
      hierarchy: UsdaHierarchyPreview | null
      artifact: null
      message: string
    }

function fingerprintBoxes(boxes: UsdaHierarchyBox[]): string {
  const h = createHash('sha256')
  for (const b of boxes) {
    h.update(`${b.path}|${b.kind}|${b.center.join(',')}|${b.size.join(',')};`)
  }
  return h.digest('hex').slice(0, 16)
}

/**
 * Compose a stage preview receipt from raw bytes — fail-closed on empty/capsule/OpenUSD claims.
 */
export function composeUsdStagePreview(input: {
  format: UsdBrowserFormatId
  bytes: ArrayBuffer | Uint8Array
  shipKind?: UsdShipKind
  geometryProxy?: 'capsule' | 'box' | 'sphere' | 'none'
  claimFullUsdStage?: boolean
}): UsdStageComposeResult {
  const view = input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes)
  const intake = evaluateUsdStageIntake({ format: input.format, bytes: view })

  if (input.claimFullUsdStage === true) {
    log.warn('usd_stage_compose_openusd_claim_blocked', { format: input.format })
    return {
      success: false,
      openUsdStageClaimable: false,
      openUsdStageReady: false,
      code: 'openusd_stage_held',
      heldReason: 'openusd_cpp_binding_absent',
      intake,
      hierarchy: null,
      artifact: null,
      message: 'Full OpenUSD/Hydra stage claim rejected — compose is wireframe/preview only.',
    }
  }

  if (input.shipKind) {
    const gate = evaluateUsdCharacterShipGate({
      shipKind: input.shipKind,
      geometryProxy: input.geometryProxy,
      format: input.format,
      claimFullUsdStage: false,
    })
    if (!gate.allowed) {
      const code: UsdStageComposeRejectCode =
        gate.reason === 'proxy_capsule_forbidden' ? 'proxy_capsule_forbidden' : 'character_gate_denied'
      log.warn('usd_stage_compose_character_gate', { code, reason: gate.reason })
      return {
        success: false,
        openUsdStageClaimable: false,
        openUsdStageReady: false,
        code,
        intake,
        hierarchy: null,
        artifact: null,
        message: gate.message,
      }
    }
  }

  if (intake.payloadKind === 'empty' || view.byteLength === 0) {
    return {
      success: false,
      openUsdStageClaimable: false,
      openUsdStageReady: false,
      code: 'empty_payload',
      heldReason: 'empty_payload',
      intake,
      hierarchy: null,
      artifact: null,
      message: intake.message,
    }
  }

  if (intake.payloadKind === 'usdc_crate' || input.format === 'usdc') {
    return {
      success: false,
      openUsdStageClaimable: false,
      openUsdStageReady: false,
      code: 'intake_held',
      heldReason: intake.heldReason,
      intake,
      hierarchy: null,
      artifact: null,
      message: intake.message,
    }
  }

  if (input.format === 'usdz') {
    if (intake.viewerStatus !== 'live') {
      return {
        success: false,
        openUsdStageClaimable: false,
        openUsdStageReady: false,
        code: 'intake_held',
        heldReason: intake.heldReason,
        intake,
        hierarchy: null,
        artifact: null,
        message: intake.message,
      }
    }
    // USDZ preview eligible — success only with non-empty ZIP bytes (already checked).
    const artifact: UsdStageComposeArtifact = {
      format: 'usdz',
      primCount: 0,
      meshCount: 0,
      xformCount: 0,
      boxCount: 0,
      boxes: [],
      hierarchySummary: 'USDZ ZIP preview eligible — hierarchy scan N/A (Three USDZLoader path)',
      previewKind: 'usdz_zip_preview_only',
      contentFingerprint: createHash('sha256').update(view).digest('hex').slice(0, 16),
    }
    // Non-empty bytes + live ZIP = non-empty compose artifact (preview receipt, not mesh stage).
    if (artifact.contentFingerprint.length < 8) {
      return {
        success: false,
        openUsdStageClaimable: false,
        openUsdStageReady: false,
        code: 'empty_compose_artifact',
        intake,
        hierarchy: null,
        artifact: null,
        message: 'USDZ compose produced empty fingerprint — fail-closed (Law XVI).',
      }
    }
    log.info('usd_stage_compose_usdz_preview', { fingerprint: artifact.contentFingerprint })
    return {
      success: true,
      openUsdStageClaimable: false,
      openUsdStageReady: false,
      intake,
      hierarchy: null,
      artifact,
      message: `${intake.message} Compose receipt fingerprint=${artifact.contentFingerprint}.`,
    }
  }

  if (!intake.hierarchyWireframeEligible) {
    return {
      success: false,
      openUsdStageClaimable: false,
      openUsdStageReady: false,
      code: 'intake_held',
      heldReason: intake.heldReason,
      intake,
      hierarchy: null,
      artifact: null,
      message: intake.message,
    }
  }

  const hierarchy = parseUsdaHierarchyPreview(view)
  if (!hierarchy.ok || hierarchy.primCount < 1 || hierarchy.boxes.length < 1) {
    return {
      success: false,
      openUsdStageClaimable: false,
      openUsdStageReady: false,
      code: hierarchy.reason === 'empty' ? 'empty_payload' : 'hierarchy_parse_failed',
      heldReason: intake.heldReason,
      intake,
      hierarchy,
      artifact: null,
      message:
        hierarchy.summary ||
        'USDA hierarchy compose failed — refuse success:true with empty prim/box artifact.',
    }
  }

  const artifact: UsdStageComposeArtifact = {
    format: input.format,
    primCount: hierarchy.primCount,
    meshCount: hierarchy.meshCount,
    xformCount: hierarchy.xformCount,
    boxCount: hierarchy.boxes.length,
    boxes: hierarchy.boxes,
    hierarchySummary: hierarchy.summary,
    previewKind: 'hierarchy_wireframe_only',
    contentFingerprint: fingerprintBoxes(hierarchy.boxes),
  }

  log.info('usd_stage_compose_hierarchy', {
    primCount: artifact.primCount,
    boxCount: artifact.boxCount,
    fingerprint: artifact.contentFingerprint,
  })

  return {
    success: true,
    openUsdStageClaimable: false,
    openUsdStageReady: false,
    intake,
    hierarchy,
    artifact,
    message: `Compose OK: ${artifact.primCount} prims / ${artifact.boxCount} boxes — hierarchy wireframe only; OpenUSD HELD.`,
  }
}

export function probeUsdStageComposeReadiness(): {
  id: 'J7-compose'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  openUsdStageReady: false
  path: string
  note: string
} {
  const usda = `#usda 1.0
def Xform "Root" {
  def Mesh "Body" {
    float3[] extent = [(-1, 0, -1), (1, 2, 1)]
  }
}
`
  const ok = composeUsdStagePreview({
    format: 'usda',
    bytes: new TextEncoder().encode(usda),
  })
  const empty = composeUsdStagePreview({ format: 'usda', bytes: new Uint8Array(0) })
  const capsule = composeUsdStagePreview({
    format: 'usda',
    bytes: new TextEncoder().encode(usda),
    shipKind: 'character',
    geometryProxy: 'capsule',
  })
  const openClaim = composeUsdStagePreview({
    format: 'usda',
    bytes: new TextEncoder().encode(usda),
    claimFullUsdStage: true,
  })
  const crate = composeUsdStagePreview({
    format: 'usdc',
    bytes: new Uint8Array([0x50, 0x58, 0x52, 0x2d, 0x55, 0x53, 0x44, 0x43]),
  })

  const ready =
    ok.success === true &&
    ok.artifact.primCount >= 1 &&
    ok.artifact.boxCount >= 1 &&
    ok.openUsdStageClaimable === false &&
    empty.success === false &&
    capsule.success === false &&
    capsule.code === 'proxy_capsule_forbidden' &&
    openClaim.success === false &&
    crate.success === false &&
    OPEN_USD_STAGE_READY === false

  return {
    id: 'J7-compose',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    openUsdStageReady: false,
    path: 'lib/production/usd-stage-compose.ts',
    note: ready
      ? 'USDA hierarchy compose receipt with non-empty boxes; empty/capsule/OpenUSD claims fail-closed; openUsdStageReady=false.'
      : 'J.7 stage compose probe failed.',
  }
}
