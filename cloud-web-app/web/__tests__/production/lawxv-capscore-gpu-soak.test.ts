/**
 * Law XV — CapScore tier gate + GPU device soak evidence.
 */

import { describe, expect, it } from 'vitest'

import {
  buildHardwareStaticProfile,
  withCapabilityScore,
} from '@aethel/engine/render/hardware-profile'
import {
  buildScalableRenderGraphReport,
  G3_CODE_DEPTH_PERCENT_LOCKED,
  selectScalableRenderTier,
  SCALABLE_RENDER_GRAPH_AAA_READY,
  NANITE_MARKETING_ALLOWED,
  LUMEN_MARKETING_ALLOWED,
} from '@aethel/engine/render/scalable-render-graph'
import {
  runGpuDeviceSoakEvidence,
  proveGpuDeviceSoakReadiness,
  GPU_DEVICE_SOAK_AAA_READY,
  WEBGPU_VIEWPORT_PRESENT_READY,
} from '@aethel/engine/render/gpu-device-soak'

describe('Law XV CapScore tier selection (fail-closed)', () => {
  it('selects real tiers from CapScore bands', () => {
    expect(selectScalableRenderTier({ capabilityScore: 12 }).ok).toBe(true)
    expect(selectScalableRenderTier({ capabilityScore: 12 })).toMatchObject({
      tier: 'webgl2',
      gate: 'pass',
      scalableRenderGraphAaaReady: false,
    })
    expect(selectScalableRenderTier({ capabilityScore: 30 })).toMatchObject({ tier: 'integrated' })
    expect(selectScalableRenderTier({ capabilityScore: 50 })).toMatchObject({ tier: 'discrete' })
    expect(selectScalableRenderTier({ capabilityScore: 80 })).toMatchObject({ tier: 'enthusiast' })
  })

  it('fail-closes when CapScore ignored or missing', () => {
    const ignored = selectScalableRenderTier({
      capabilityScore: 55,
      ignoreCapabilityScore: true,
    })
    expect(ignored.ok).toBe(false)
    if (!ignored.ok) expect(ignored.rejectCode).toBe('capability_score_ignored')

    const missing = selectScalableRenderTier({ capabilityScore: undefined })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.rejectCode).toBe('missing_capability_score')

    const nan = selectScalableRenderTier({ capabilityScore: Number.NaN })
    expect(nan.ok).toBe(false)
    if (!nan.ok) expect(nan.rejectCode).toBe('non_finite_capability_score')
  })

  it('fail-closes claimed enthusiast vs webgl2 CapScore', () => {
    const mismatch = selectScalableRenderTier({
      capabilityScore: 12,
      claimedTier: 'enthusiast',
    })
    expect(mismatch.ok).toBe(false)
    if (!mismatch.ok) expect(mismatch.rejectCode).toBe('tier_mismatch')
  })

  it('SRG report refuses plan when CapScore ignored — no empty success', () => {
    const profile = buildHardwareStaticProfile({
      webgpuAvailable: true,
      hardwareConcurrency: 8,
      deviceMemoryGb: 8,
    })
    const refused = buildScalableRenderGraphReport(profile, { ignoreCapabilityScore: true })
    expect(refused.planAllowed).toBe(false)
    expect(refused.executableNodeCount).toBe(0)
    expect(refused.fsrExecutorLive).toBe(false)
    expect(refused.capScoreGate.ok).toBe(false)
    expect(refused.scalableRenderGraphAaaReady).toBe(false)
    expect(refused.naniteMarketingAllowed).toBe(false)
    expect(refused.lumenMarketingAllowed).toBe(false)
    expect(refused.g3CodeDepthPercent).toBe(G3_CODE_DEPTH_PERCENT_LOCKED)
    expect(refused.g3PercentUpliftRequiresLadder).toBe(true)
    expect(refused.claim).toMatch(/FAIL_CLOSED/)
  })

  it('SRG report passes CapScore gate and keeps G.3% locked + AAA false', () => {
    const profile = buildHardwareStaticProfile({
      webgpuAvailable: true,
      hardwareConcurrency: 12,
      deviceMemoryGb: 16,
      maxTextureDimension2D: 8192,
    })
    const report = buildScalableRenderGraphReport(profile)
    expect(report.planAllowed).toBe(true)
    expect(report.capScoreGate.ok).toBe(true)
    expect(report.tier).toBe(report.capScoreGate.ok ? report.capScoreGate.tier : null)
    expect(report.fsrExecutorLive).toBe(true)
    expect(report.frameGraphLive).toBe(false)
    expect(report.g3CodeDepthPercent).toBe(15)
    expect(SCALABLE_RENDER_GRAPH_AAA_READY).toBe(false)
    expect(NANITE_MARKETING_ALLOWED).toBe(false)
    expect(LUMEN_MARKETING_ALLOWED).toBe(false)
    expect(report.claim).toMatch(/CapScore gate PASS/)
    expect(report.claim).toMatch(/G\.3 code-depth locked 15%/)
  })

  it('withCapabilityScore re-derives tier so score override cannot leave stale tier', () => {
    const base = buildHardwareStaticProfile({
      webgpuAvailable: true,
      hardwareConcurrency: 12,
      deviceMemoryGb: 16,
    })
    // Force low CapScore onto a higher probe profile — tier must follow score.
    const lowered = withCapabilityScore(base, 12)
    expect(lowered.capabilityScore).toBe(12)
    expect(lowered.tier).toBe('webgl2')
    expect(buildScalableRenderGraphReport(lowered).tier).toBe('webgl2')

    const raised = withCapabilityScore(lowered, 55)
    expect(raised.capabilityScore).toBe(55)
    expect(raised.tier).toBe('discrete')
    const srg = buildScalableRenderGraphReport(raised)
    expect(srg.planAllowed).toBe(true)
    expect(srg.tier).toBe('discrete')
  })
})

describe('Law XV GPU device soak evidence', () => {
  it('records adapter limits + Instant duration — no Math.random FPS invent', () => {
    let t = 1000
    const result = runGpuDeviceSoakEvidence({
      adapterName: 'Vitest Injected Adapter',
      limits: {
        maxTextureDimension2D: 8192,
        maxBufferSize: 268_435_456,
        maxBindGroups: 4,
        maxComputeWorkgroupSizeX: 256,
      },
      webgpuAvailable: true,
      hardwareConcurrency: 8,
      deviceMemoryGb: 8,
      frameIterations: 48,
      now: () => {
        t += 0.5
        return t
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const e = result.evidence
    expect(e.success).toBe(true)
    expect(e.evidenceFingerprint).toMatch(/^[a-f0-9]{16}$/)
    expect(e.limits.maxTextureDimension2D).toBe(8192)
    expect(e.durationMs).toBeGreaterThan(0)
    expect(e.measuredFps).not.toBeNull()
    expect(Number.isFinite(e.measuredFps!)).toBe(true)
    expect(e.measuredFps!).toBeGreaterThan(0)
    expect(e.capScoreSelection.ok).toBe(true)
    expect(e.scalableRenderGraph.planAllowed).toBe(true)
    expect(e.scalableRenderGraphAaaReady).toBe(false)
    expect(e.webgpuViewportPresentReady).toBe(false)
    expect(e.marketingAllowed).toBe(false)
    expect(e.frameGraphLive).toBe(false)
    expect(e.naniteMarketingAllowed).toBe(false)
    expect(e.lumenMarketingAllowed).toBe(false)
    expect(GPU_DEVICE_SOAK_AAA_READY).toBe(false)
    expect(WEBGPU_VIEWPORT_PRESENT_READY).toBe(false)
  })

  it('fail-closes without adapter limits — success never true', () => {
    const bad = runGpuDeviceSoakEvidence({
      limits: { maxTextureDimension2D: 0 },
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.success).toBe(false)
    expect(bad.code).toBe('no_adapter_limits')
    expect(bad.marketingAllowed).toBe(false)
  })

  it('proveGpuDeviceSoakReadiness returns PARTIAL fingerprint with AAA false', () => {
    const probe = proveGpuDeviceSoakReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.aaaReady).toBe(false)
    expect(probe.marketingAllowed).toBe(false)
    expect(probe.evidenceFingerprint).toMatch(/^[a-f0-9]{16}$/)
  })
})
