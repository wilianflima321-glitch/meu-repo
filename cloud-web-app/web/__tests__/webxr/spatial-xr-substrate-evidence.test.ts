/**
 * Onda K — Spatial XR / WebXR substrate evidence.
 */

import { describe, expect, it } from 'vitest'

import {
  OPENXR_DESKTOP_PARITY_READY,
  SPATIAL_XR_MARKETING_ALLOWED,
  SPATIAL_XR_PRODUCT_READY,
  WEBXR_VIEWPORT_ENTRY_PRODUCT_READY,
  claimSpatialXrProductReady,
  claimWebXrViewportEntryReady,
  probeSpatialXrSubstrateReadiness,
  runSpatialXrSubstrateEvidenceSoak,
} from '@/lib/webxr/spatial-xr-substrate-evidence'
import {
  WEBXR_MARKETING_SHIP_ALLOWED,
  WEBXR_VIEWPORT_ENTRY_WIRED,
} from '@/lib/webxr/webxr-honesty-capability'

describe('Spatial XR substrate evidence', () => {
  it('seals foveation apply without Spatial XR marketing', () => {
    const soak = runSpatialXrSubstrateEvidenceSoak({
      webxrApiAvailable: true,
      sessionActive: false,
    })
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.value.foveationApplied).toBe(true)
    expect(soak.value.fixedFoveationValue).toBeGreaterThan(0)
    expect(soak.value.honestyShipStatus).toBe('PARTIAL')
    expect(soak.value.viewportEntryWired).toBe(false)
    expect(soak.value.fingerprint.length).toBeGreaterThanOrEqual(8)
    expect(soak.value.spatialXrMarketingAllowed).toBe(false)
    expect(soak.value.spatialXrProductReady).toBe(false)
  })

  it('holds honesty without XR API and refuses product claims', () => {
    const noApi = runSpatialXrSubstrateEvidenceSoak({ webxrApiAvailable: false })
    expect(noApi.ok).toBe(true)
    if (!noApi.ok) return
    expect(noApi.value.honestyShipStatus).toBe('HELD')
    expect(claimSpatialXrProductReady().ok).toBe(false)
    expect(claimWebXrViewportEntryReady().ok).toBe(false)
    expect(SPATIAL_XR_MARKETING_ALLOWED).toBe(false)
    expect(SPATIAL_XR_PRODUCT_READY).toBe(false)
    expect(WEBXR_VIEWPORT_ENTRY_PRODUCT_READY).toBe(false)
    expect(OPENXR_DESKTOP_PARITY_READY).toBe(false)
    expect(WEBXR_VIEWPORT_ENTRY_WIRED).toBe(false)
    expect(WEBXR_MARKETING_SHIP_ALLOWED).toBe(false)
  })

  it('probe stays PARTIAL', () => {
    const probe = probeSpatialXrSubstrateReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.spatialXrMarketingAllowed).toBe(false)
  })
})
