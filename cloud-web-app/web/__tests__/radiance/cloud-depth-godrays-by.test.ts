/**
 * Letter by — CLOUD-001 god-rays / depth-blend deepen (Zero-MVP).
 * Adaptive Law XV params; production claim CLOSED only with real path; humble AAA marketing.
 */

import { describe, expect, it } from 'vitest'
import {
  resolveCloudAdaptiveParams,
  resolveRadianceCapabilityBudget,
} from '@/lib/radiance/radiance-capability-budget'
import {
  CLOUD_DEPTH_GODRAYS_LETTER,
  probeCloud001Honesty,
  probeRadianceWiringHonesty,
  proveCloudAdaptiveParams,
} from '@/lib/radiance/radiance-honesty'
import {
  CLOUD_001_LETTER,
  MARKETING_FULL_VOLUMETRIC_AAA_ALLOWED,
  VOLUMETRIC_CLOUDS_SHIP_STATUS,
} from '@/lib/volumetric-clouds'
import { createVolumetricCloudAdapterSummary } from '@/lib/production/engine-module-adapters'

describe('CLOUD-001 adaptive params (by)', () => {
  it('GT730 / webgl2: depth blend on, god-rays fail-closed, cheap steps', () => {
    const p = proveCloudAdaptiveParams(12)
    expect(p.tier).toBe('webgl2')
    expect(p.depthBlendAllowed).toBe(true)
    expect(p.godRaysAllowed).toBe(false)
    expect(p.godRaySamples).toBe(0)
    expect(p.godRayIntensity).toBe(0)
    expect(p.cloudMaxSteps).toBe(8)
    expect(p.cloudLightSteps).toBe(2)
  })

  it('integrated: depth blend on, god-rays still fail-closed beauty', () => {
    const p = resolveCloudAdaptiveParams(30)
    expect(p.tier).toBe('integrated')
    expect(p.depthBlendAllowed).toBe(true)
    expect(p.godRaysAllowed).toBe(false)
    expect(p.cloudMaxSteps).toBe(16)
  })

  it('discrete: god-rays unlock with adaptive samples/intensity', () => {
    const p = resolveCloudAdaptiveParams(55)
    expect(p.tier).toBe('discrete')
    expect(p.godRaysAllowed).toBe(true)
    expect(p.godRaySamples).toBe(48)
    expect(p.godRayIntensity).toBe(0.45)
    expect(p.cloudMaxSteps).toBe(32)
  })

  it('enthusiast: higher samples; still no HW RT / full AAA marketing', () => {
    const p = resolveCloudAdaptiveParams(80)
    expect(p.godRaysAllowed).toBe(true)
    expect(p.godRaySamples).toBe(80)
    expect(p.godRayIntensity).toBe(0.65)
    expect(resolveRadianceCapabilityBudget(80).hwRayTracingClaimAllowed).toBe(false)
    expect(MARKETING_FULL_VOLUMETRIC_AAA_ALLOWED).toBe(false)
  })

  it('scales steps + god-ray knobs with Capability Score', () => {
    expect(resolveCloudAdaptiveParams(10).cloudMaxSteps).toBe(8)
    expect(resolveCloudAdaptiveParams(30).cloudMaxSteps).toBe(16)
    expect(resolveCloudAdaptiveParams(55).cloudMaxSteps).toBe(32)
    expect(resolveCloudAdaptiveParams(80).cloudMaxSteps).toBe(64)
    expect(resolveCloudAdaptiveParams(10).godRaysAllowed).toBe(false)
    expect(resolveCloudAdaptiveParams(55).godRaysAllowed).toBe(true)
  })
})

describe('CLOUD-001 honesty probe (by)', () => {
  it('flips CLOSED ship status when path wired; marketing stays humble', () => {
    expect(VOLUMETRIC_CLOUDS_SHIP_STATUS).toBe('CLOSED')
    expect(CLOUD_001_LETTER).toBe('by')
    expect(CLOUD_DEPTH_GODRAYS_LETTER).toBe('by')

    const probe = probeCloud001Honesty({
      capabilityScore: 55,
      depthBlendWired: true,
      godRaysPassInRenderPath: true,
      framesComposited: 2,
      depthBlendUsed: true,
      godRaysUsed: true,
    })
    expect(probe.shipStatus).toBe('CLOSED')
    expect(probe.pathProven).toBe(true)
    expect(probe.depthBlendReady).toBe(true)
    expect(probe.marketingFullVolumetricAaaAllowed).toBe(false)
  })

  it('webgl2 probe: god-rays not required for path; fail-closed beauty', () => {
    const probe = probeCloud001Honesty({
      capabilityScore: 10,
      depthBlendWired: true,
      godRaysPassInRenderPath: true,
      framesComposited: 1,
      depthBlendUsed: true,
      godRaysUsed: false,
    })
    expect(probe.adaptive.godRaysAllowed).toBe(false)
    expect(probe.pathProven).toBe(true)
    expect(probe.marketingFullVolumetricAaaAllowed).toBe(false)
  })

  it('adapter summary matches CLOSED depth/god-ray path', () => {
    const summary = createVolumetricCloudAdapterSummary()
    expect(summary.shipStatus).toBe('CLOSED')
    expect(summary.depthBlend).toBe(true)
    expect(summary.godRaysInRenderPath).toBe(true)
    expect(summary.marketingFullVolumetricAaaAllowed).toBe(false)
  })
})

describe('Radiance honesty includes CLOUD-001 by fields', () => {
  it('proves depth/god-ray participation under discrete budget', () => {
    const probe = probeRadianceWiringHonesty({
      capabilityScore: 55,
      framesWithHooks: 2,
      rtInFrameLoop: true,
      cloudsInFrameLoop: true,
      shadowsInFrameLoop: true,
      bvhModulePresent: true,
      denoiserModulePresent: true,
      depthBlendInFrameLoop: true,
      godRaysInFrameLoop: true,
    })
    expect(probe.cloudShipStatus).toBe('CLOSED')
    expect(probe.depthBlendInFrameLoop).toBe(true)
    expect(probe.godRaysInFrameLoop).toBe(true)
    expect(probe.marketingFullVolumetricAaaAllowed).toBe(false)
    expect(probe.hwRayTracingClaimAllowed).toBe(false)
  })

  it('webgl2: god-rays participation ignored / fail-closed', () => {
    const probe = probeRadianceWiringHonesty({
      capabilityScore: 10,
      framesWithHooks: 1,
      rtInFrameLoop: false,
      cloudsInFrameLoop: true,
      shadowsInFrameLoop: true,
      bvhModulePresent: true,
      denoiserModulePresent: true,
      depthBlendInFrameLoop: true,
      godRaysInFrameLoop: true,
    })
    expect(probe.budget.godRaysAllowed).toBe(false)
    expect(probe.godRaysInFrameLoop).toBe(false)
    expect(probe.depthBlendInFrameLoop).toBe(true)
    expect(probe.notes.some((n) => n.includes('fail-closed') && n.includes('god-rays'))).toBe(true)
  })
})
