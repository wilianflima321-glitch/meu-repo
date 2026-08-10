/**
 * Onda K — Spatial XR / WebXR substrate evidence (fail-closed marketing).
 *
 * Seals foveation applyToLayer + honesty evaluation fingerprints.
 * Viewport entry / Spatial XR product marketing stay HELD.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { FoveatedRenderingManager } from '@/lib/webxr-vr-foveated-rendering'
import {
  WEBXR_MARKETING_SHIP_ALLOWED,
  WEBXR_VIEWPORT_ENTRY_WIRED,
  evaluateWebXrHonesty,
} from '@/lib/webxr/webxr-honesty-capability'

const log = createComponentLogger('spatial-xr-substrate-evidence')

export const SPATIAL_XR_MARKETING_ALLOWED = false as const
export const SPATIAL_XR_PRODUCT_READY = false as const
export const WEBXR_VIEWPORT_ENTRY_PRODUCT_READY = false as const
export const OPENXR_DESKTOP_PARITY_READY = false as const

export type SpatialXrRejectCode =
  | 'foveation_not_applied'
  | 'marketing_leak'
  | 'aaa_claim_held'
  | 'viewport_claim_held'

export type SpatialXrResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: SpatialXrRejectCode; message: string }

export type SpatialXrSubstrateEvidence = {
  version: 1
  foveationApplied: true
  fixedFoveationValue: number
  foveationLevel: number
  honestyShipStatus: 'HELD' | 'PARTIAL' | 'IMPLEMENTED'
  viewportEntryWired: false
  fingerprint: string
  spatialXrMarketingAllowed: false
  spatialXrProductReady: false
  openXrDesktopParityReady: false
  webxrMarketingShipAllowed: false
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

/**
 * Run foveation apply soak on a mock XRWebGLLayer + honesty evaluation.
 */
export function runSpatialXrSubstrateEvidenceSoak(input?: {
  webxrApiAvailable?: boolean
  sessionActive?: boolean
}): SpatialXrResult<SpatialXrSubstrateEvidence> {
  const mgr = new FoveatedRenderingManager()
  // Enable path requires session.baseLayer.fixedFoveation — mock XRSession surface.
  const mockSession = {
    renderState: {
      baseLayer: { fixedFoveation: 0 },
    },
  } as unknown as XRSession

  const enabled = mgr.enable(mockSession)
  if (!enabled) {
    return {
      ok: false,
      code: 'foveation_not_applied',
      message: 'FoveatedRenderingManager.enable failed on mock XRSession',
    }
  }

  mgr.setFoveationLevel(3)
  mgr.updateGazePoint(0.42, 0.58)
  const layer = { fixedFoveation: 0 }
  mgr.applyToLayer(layer)

  if (typeof layer.fixedFoveation !== 'number' || !(layer.fixedFoveation > 0)) {
    return {
      ok: false,
      code: 'foveation_not_applied',
      message: 'applyToLayer did not stamp fixedFoveation on mock layer',
    }
  }

  const honesty = evaluateWebXrHonesty({
    webxrApiAvailable: input?.webxrApiAvailable !== false,
    sessionActive: input?.sessionActive === true,
    foveationWiredInFrameLoop: true,
    viewportEntryWired: WEBXR_VIEWPORT_ENTRY_WIRED,
  })

  if (honesty.marketingAllowed || WEBXR_MARKETING_SHIP_ALLOWED || SPATIAL_XR_MARKETING_ALLOWED) {
    return {
      ok: false,
      code: 'marketing_leak',
      message: 'Spatial XR marketing unexpectedly allowed — refuse evidence PASS',
    }
  }

  if (WEBXR_VIEWPORT_ENTRY_WIRED || WEBXR_VIEWPORT_ENTRY_PRODUCT_READY) {
    return {
      ok: false,
      code: 'viewport_claim_held',
      message: 'Viewport entry claimed ready — fail-closed until Studio WebXR entry ships',
    }
  }

  const uniforms = mgr.getShaderUniforms()
  const fp = fingerprint([
    'onda-k-spatial-xr',
    String(layer.fixedFoveation),
    String(mgr.isEnabled()),
    String(uniforms.u_foveationLevel),
    honesty.shipStatus,
    ...honesty.evidenceRefs,
    'viewportEntry:false',
    'marketing:false',
  ])

  const evidence: SpatialXrSubstrateEvidence = {
    version: 1,
    foveationApplied: true,
    fixedFoveationValue: layer.fixedFoveation,
    foveationLevel: 3,
    honestyShipStatus: honesty.shipStatus,
    viewportEntryWired: false,
    fingerprint: fp,
    spatialXrMarketingAllowed: false,
    spatialXrProductReady: false,
    openXrDesktopParityReady: false,
    webxrMarketingShipAllowed: false,
  }

  log.info('spatial_xr_substrate_evidence_sealed', {
    fingerprint: fp,
    fixedFoveation: layer.fixedFoveation,
    honesty: honesty.shipStatus,
    marketing: false,
  })

  return { ok: true, value: evidence }
}

export function claimSpatialXrProductReady(): SpatialXrResult<never> {
  return {
    ok: false,
    code: 'aaa_claim_held',
    message: 'SPATIAL_XR_PRODUCT_READY=false — foveation substrate ≠ Spatial XR product ship',
  }
}

export function claimWebXrViewportEntryReady(): SpatialXrResult<never> {
  return {
    ok: false,
    code: 'viewport_claim_held',
    message: 'WEBXR_VIEWPORT_ENTRY_PRODUCT_READY=false — Studio viewport XR entry remains HELD',
  }
}

export function probeSpatialXrSubstrateReadiness(): {
  id: 'onda-k-spatial-xr'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  spatialXrMarketingAllowed: false
  spatialXrProductReady: false
  path: string
  note: string
} {
  const soak = runSpatialXrSubstrateEvidenceSoak({ webxrApiAvailable: true, sessionActive: false })
  const noApi = runSpatialXrSubstrateEvidenceSoak({ webxrApiAvailable: false })
  const product = claimSpatialXrProductReady()
  const viewport = claimWebXrViewportEntryReady()

  const ready =
    soak.ok &&
    soak.value.fingerprint.length >= 8 &&
    soak.value.foveationApplied === true &&
    soak.value.spatialXrMarketingAllowed === false &&
    // Without viewport entry, honesty stays PARTIAL even with API present.
    soak.value.honestyShipStatus === 'PARTIAL' &&
    noApi.ok &&
    noApi.value.honestyShipStatus === 'HELD' &&
    !product.ok &&
    !viewport.ok &&
    SPATIAL_XR_MARKETING_ALLOWED === false &&
    SPATIAL_XR_PRODUCT_READY === false &&
    WEBXR_VIEWPORT_ENTRY_WIRED === false &&
    WEBXR_MARKETING_SHIP_ALLOWED === false

  return {
    id: 'onda-k-spatial-xr',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    spatialXrMarketingAllowed: false,
    spatialXrProductReady: false,
    path: 'lib/webxr/spatial-xr-substrate-evidence.ts',
    note: ready
      ? 'WebXR foveation substrate evidence PARTIAL; Spatial XR marketing / viewport entry / OpenXR desktop HELD.'
      : 'Spatial XR substrate probe failed.',
  }
}
