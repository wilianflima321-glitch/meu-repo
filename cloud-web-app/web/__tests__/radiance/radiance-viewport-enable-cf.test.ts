/**
 * Letter cf — Radiance viewport enable + RT/shadow composite (Zero-MVP).
 * Real enable callers; Law XV GT730 fail-closed; no HW RT / Lumen marketing.
 */

import { describe, expect, it } from 'vitest'
import {
  RADIANCE_VIEWPORT_DEFAULT_CAPABILITY_SCORE,
  RADIANCE_VIEWPORT_ENABLE_LETTER,
  RADIANCE_VIEWPORT_ENABLE_WIRED,
  RADIANCE_STUDIO_VIEWPORT_WIRED,
  planRadianceViewportEnable,
} from '@/lib/radiance/radiance-viewport-enable'
import {
  RADIANCE_RT_COMPOSITE_LETTER,
  RADIANCE_RT_COMPOSITE_WIRED,
  shouldCompositeRtToFrame,
} from '@/lib/radiance/radiance-rt-composite'
import {
  probeRadianceViewportEnableHonesty,
  probeRadianceWiringHonesty,
  RADIANCE_VIEWPORT_COMPOSITE_LETTER,
} from '@/lib/radiance/radiance-honesty'
import { resolveRadianceCapabilityBudget } from '@/lib/radiance/radiance-capability-budget'

describe('Radiance viewport enable path (cf)', () => {
  it('wires letter + enable module flags', () => {
    expect(RADIANCE_VIEWPORT_ENABLE_LETTER).toBe('cf')
    expect(RADIANCE_VIEWPORT_COMPOSITE_LETTER).toBe('cf')
    expect(RADIANCE_RT_COMPOSITE_LETTER).toBe('cf')
    expect(RADIANCE_VIEWPORT_ENABLE_WIRED).toBe(true)
    expect(RADIANCE_STUDIO_VIEWPORT_WIRED).toBe(true)
    expect(RADIANCE_RT_COMPOSITE_WIRED).toBe(true)
  })

  it('plans enableRadiance call for default playtest/studio path', () => {
    const plan = planRadianceViewportEnable({})
    expect(plan.wouldCallEnableRadiance).toBe(true)
    expect(plan.enabled).toBe(true)
    expect(plan.budget.capabilityScore).toBe(RADIANCE_VIEWPORT_DEFAULT_CAPABILITY_SCORE)
    expect(plan.hwRayTracingClaimAllowed).toBe(false)
    expect(plan.marketingRadianceGiAllowed).toBe(false)
  })

  it('GT730 / webgl2: Zero-UI fail-closed RT+god-rays; still would enable wire', () => {
    const plan = planRadianceViewportEnable({ capabilityScore: 12 })
    expect(plan.wouldCallEnableRadiance).toBe(true)
    expect(plan.budget.tier).toBe('webgl2')
    expect(plan.rtInFrameAllowed).toBe(false)
    expect(plan.godRaysAllowed).toBe(false)
    expect(plan.zeroUiFailClosed).toBe(true)
    expect(plan.budget.cloudsInFrameAllowed).toBe(true)
    expect(plan.budget.shadowTechnique).not.toBe('off')
  })

  it('opt-out skips enable without inventing chrome', () => {
    const plan = planRadianceViewportEnable({ radianceRequested: false })
    expect(plan.wouldCallEnableRadiance).toBe(false)
    expect(plan.enabled).toBe(false)
    expect(plan.zeroUiFailClosed).toBe(true)
  })

  it('discrete: RT+god-rays allowed under budget; still no HW RT claim', () => {
    const plan = planRadianceViewportEnable({ capabilityScore: 55 })
    expect(plan.rtInFrameAllowed).toBe(true)
    expect(plan.godRaysAllowed).toBe(true)
    expect(plan.hwRayTracingClaimAllowed).toBe(false)
    expect(plan.zeroUiFailClosed).toBe(false)
  })

  it('plans studio R3F enable path (enableRadianceOnGlContext)', () => {
    const plan = planRadianceViewportEnable({ studioGl: true, capabilityScore: 40 })
    expect(plan.wouldCallEnableRadiance).toBe(true)
    expect(plan.enablePath).toBe('studio-gl')
    expect(plan.notes.some((n) => n.includes('studio R3F'))).toBe(true)
    expect(plan.hwRayTracingClaimAllowed).toBe(false)
  })
})

describe('Radiance RT composite gate (cf)', () => {
  it('composites only when budget allows + texture present', () => {
    expect(
      shouldCompositeRtToFrame({ rtInFrameAllowed: true, rtTexturePresent: true }),
    ).toBe(true)
    expect(
      shouldCompositeRtToFrame({ rtInFrameAllowed: false, rtTexturePresent: true }),
    ).toBe(false)
    expect(
      shouldCompositeRtToFrame({ rtInFrameAllowed: true, rtTexturePresent: false }),
    ).toBe(false)
  })

  it('webgl2 budget never allows RT composite', () => {
    const b = resolveRadianceCapabilityBudget(10)
    expect(b.rtInFrameAllowed).toBe(false)
    expect(
      shouldCompositeRtToFrame({
        rtInFrameAllowed: b.rtInFrameAllowed,
        rtTexturePresent: true,
      }),
    ).toBe(false)
  })
})

describe('Radiance viewport enable honesty (cf)', () => {
  it('does not flip ready without enable caller + frames', () => {
    const probe = probeRadianceViewportEnableHonesty({
      capabilityScore: 30,
      enableCalled: false,
      framesWithHooks: 0,
      rtComposited: false,
      shadowsInFrame: false,
      cloudsInFrame: false,
    })
    expect(probe.radianceViewportEnableReady).toBe(false)
    expect(probe.hwRayTracingClaimAllowed).toBe(false)
    expect(probe.marketingRadianceGiAllowed).toBe(false)
    expect(probe.notes.some((n) => n.includes('never called'))).toBe(true)
  })

  it('flips ready when enable path + frame hooks proven', () => {
    const probe = probeRadianceViewportEnableHonesty({
      capabilityScore: 30,
      enableCalled: true,
      framesWithHooks: 2,
      rtComposited: true,
      shadowsInFrame: true,
      cloudsInFrame: true,
    })
    expect(probe.radianceViewportEnableReady).toBe(true)
    expect(probe.radianceCompositeProven).toBe(true)
    expect(probe.hwRayTracingClaimAllowed).toBe(false)
  })

  it('GT730: Zero-UI fail-closed; ready without RT composite claim', () => {
    const probe = probeRadianceViewportEnableHonesty({
      capabilityScore: 12,
      enableCalled: true,
      framesWithHooks: 1,
      rtComposited: false,
      shadowsInFrame: true,
      cloudsInFrame: true,
    })
    expect(probe.zeroUiFailClosed).toBe(true)
    expect(probe.radianceViewportEnableReady).toBe(true)
    expect(probe.radianceCompositeProven).toBe(true)
  })

  it('wiring honesty records viewport enable + composite flags', () => {
    const probe = probeRadianceWiringHonesty({
      capabilityScore: 55,
      framesWithHooks: 3,
      rtInFrameLoop: true,
      cloudsInFrameLoop: true,
      shadowsInFrameLoop: true,
      bvhModulePresent: true,
      denoiserModulePresent: true,
      viewportEnableCalled: true,
      rtCompositedInFrameLoop: true,
    })
    expect(probe.viewportEnableCalled).toBe(true)
    expect(probe.rtCompositedInFrameLoop).toBe(true)
    expect(probe.frameHooksProven).toBe(true)
    expect(probe.hwRayTracingClaimAllowed).toBe(false)
    expect(probe.marketingRadianceGiAllowed).toBe(false)
  })

  it('webgl2 rejects claimed RT composite in wiring honesty', () => {
    const probe = probeRadianceWiringHonesty({
      capabilityScore: 10,
      framesWithHooks: 1,
      rtInFrameLoop: false,
      cloudsInFrameLoop: true,
      shadowsInFrameLoop: true,
      bvhModulePresent: true,
      denoiserModulePresent: true,
      viewportEnableCalled: true,
      rtCompositedInFrameLoop: true,
    })
    expect(probe.rtCompositedInFrameLoop).toBe(false)
    expect(probe.notes.some((n) => n.includes('RT composite must fail-closed'))).toBe(true)
  })
})
