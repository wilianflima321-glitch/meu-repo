/**
 * Letter ci — FSR ScalableRenderGraph executor + CapScore upscale Vitest.
 */

import { describe, expect, it } from 'vitest'
import { buildHardwareStaticProfile } from '@aethel/engine/render/hardware-profile'
import {
  BLUEPRINTS,
  buildScalableRenderGraphReport,
  executeFsrSrgNode,
  proveFsrSrgExecutorSoak,
  resolveFsrSrgExecutorPlan,
  resolveInternalPresentSize,
  FSR_SRG_EXECUTOR_LETTER,
  DLSS_NATIVE_WEB_HELD,
} from '@aethel/engine/render/scalable-render-graph'
import {
  planFsrFrameEnable,
  proveFsrSrgWire,
  probeFsrSrgHonesty,
  FSR_SRG_LETTER,
} from '@/lib/hardware'

describe('FSR SRG executor (ci)', () => {
  it('CapScore budget selects GT730 performance upscale', () => {
    const plan = resolveFsrSrgExecutorPlan({ capabilityScore: 12 })
    expect(plan.letter).toBe('ci')
    expect(plan.mode).toBe('performance')
    expect(plan.internalScale).toBe(0.5)
    expect(plan.upscaleActive).toBe(true)
    expect(plan.dlssNativeAllowed).toBe(false)
    expect(DLSS_NATIVE_WEB_HELD).toBe(true)

    const { internalWidth, internalHeight } = resolveInternalPresentSize(1280, 720, plan.internalScale)
    expect(internalWidth).toBe(640)
    expect(internalHeight).toBe(360)
  })

  it('enthusiast CapScore → native Zero-UI (no upscale chrome)', () => {
    const plan = resolveFsrSrgExecutorPlan({ capabilityScore: 80 })
    expect(plan.mode).toBe('native')
    expect(plan.upscaleActive).toBe(false)
    const frame = planFsrFrameEnable({ capabilityScore: 80 })
    expect(frame.upscaleActive).toBe(false)
    expect(frame.zeroUiFailClosed).toBe(true)
    expect(frame.wouldCallEnableFsr).toBe(true)
  })

  it('SRG registers FSR executor; frameGraphLive stays HELD', () => {
    expect(BLUEPRINTS.webgl2.nodes).toContain('FSR')
    const profile = buildHardwareStaticProfile({
      webgpuAvailable: false,
      webgl2Available: true,
      hardwareConcurrency: 4,
      deviceMemoryGb: 4,
    })
    const report = buildScalableRenderGraphReport({
      ...profile,
      capabilityScore: 12,
      tier: 'webgl2',
    })
    expect(report.frameGraphLive).toBe(false)
    expect(report.fsrExecutorLive).toBe(true)
    expect(report.executableNodeCount).toBeGreaterThanOrEqual(1)
    const fsr = report.nodes.find((n) => n.id === 'FSR')
    expect(fsr?.status).toBe('registered')
    expect(report.nodes.filter((n) => n.id !== 'FSR').every((n) => n.status === 'held')).toBe(
      true,
    )
    expect(report.claim).toMatch(/FSR spatial executor \[CLOSED letter ci\]/)
    expect(report.claim).toMatch(/DLSS web HELD/)
  })

  it('executeFsrSrgNode spatial soak + honesty fsrSrgReady', () => {
    const soak = proveFsrSrgExecutorSoak(12)
    expect(soak.passed).toBe(true)
    expect(soak.letter).toBe(FSR_SRG_EXECUTOR_LETTER)

    const result = executeFsrSrgNode({
      capabilityScore: 12,
      presentWidth: 4,
      presentHeight: 4,
      srcLuma: new Float32Array(2 * 2).fill(0.5),
    })
    expect(result.executed).toBe(true)
    expect(result.dstLuma?.length).toBe(16)
    expect(result.dlssNativeAllowed).toBe(false)

    const wire = proveFsrSrgWire(12)
    expect(wire.passed).toBe(true)
    expect(wire.fsrNodeRegistered).toBe(true)

    const honesty = probeFsrSrgHonesty({ capabilityScore: 12 })
    expect(honesty.letter).toBe(FSR_SRG_LETTER)
    expect(honesty.letter).toBe('ci')
    expect(honesty.fsrSrgReady).toBe(true)
    expect(honesty.frameGraphLive).toBe(false)
    expect(honesty.dlssNativeWebAllowed).toBe(false)
    expect(honesty.zeroUiWhenUnavailable).toBe(true)
  })

  it('opt-out skips enable; integrated CapScore balanced', () => {
    const skipped = planFsrFrameEnable({ capabilityScore: 30, fsrRequested: false })
    expect(skipped.enablePath).toBe('skipped')
    expect(skipped.wouldCallEnableFsr).toBe(false)
    expect(skipped.zeroUiFailClosed).toBe(true)

    const balanced = planFsrFrameEnable({ capabilityScore: 30 })
    expect(balanced.plan.mode).toBe('balanced')
    expect(balanced.upscaleActive).toBe(true)
  })
})
