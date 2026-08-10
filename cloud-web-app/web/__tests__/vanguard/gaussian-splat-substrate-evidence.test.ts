/**
 * Onda K — 3DGS Gaussian splat substrate evidence (fail-closed AAA).
 */

import { describe, expect, it } from 'vitest'

import {
  GAUSSIAN_SPLAT_AAA_READY,
  GAUSSIAN_SPLAT_MARKETING_ALLOWED,
  INSTANT_NGP_PARITY_READY,
  SPLAT_VIEWPORT_PRODUCT_READY,
  buildGaussianSplatEvidenceCloud,
  claimGaussianSplatAaa,
  claimInstantNgpParity,
  probeGaussianSplatSubstrateReadiness,
  runGaussianSplatSubstrateEvidenceSoak,
} from '@/lib/vanguard/gaussian-splat-substrate-evidence'

describe('Onda K 3DGS splat substrate evidence', () => {
  it('seals splat→MC mesh without AAA/NGP claims', () => {
    const cloud = buildGaussianSplatEvidenceCloud(48)
    expect(cloud.splatCount).toBe(48)
    const soak = runGaussianSplatSubstrateEvidenceSoak({ cloud, resolution: 8 })
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.value.splatToMeshReady).toBe(true)
    expect(soak.value.triangleCount).toBeGreaterThan(0)
    expect(soak.value.fingerprint.length).toBeGreaterThanOrEqual(8)
    expect(soak.value.gaussianSplatAaaReady).toBe(false)
    expect(soak.value.instantNgpParityReady).toBe(false)
    expect(soak.value.splatViewportProductReady).toBe(false)
    expect(soak.value.marketingAllowed).toBe(false)
  })

  it('refuses sparse clouds and marketing claims', () => {
    expect(
      runGaussianSplatSubstrateEvidenceSoak({
        cloud: { positions: new Float32Array(3), splatCount: 1 },
      }).ok,
    ).toBe(false)
    expect(claimGaussianSplatAaa().ok).toBe(false)
    expect(claimInstantNgpParity().ok).toBe(false)
    expect(GAUSSIAN_SPLAT_AAA_READY).toBe(false)
    expect(INSTANT_NGP_PARITY_READY).toBe(false)
    expect(GAUSSIAN_SPLAT_MARKETING_ALLOWED).toBe(false)
    expect(SPLAT_VIEWPORT_PRODUCT_READY).toBe(false)
  })

  it('probe stays PARTIAL', () => {
    const probe = probeGaussianSplatSubstrateReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.gaussianSplatAaaReady).toBe(false)
    expect(probe.marketingAllowed).toBe(false)
  })
})
