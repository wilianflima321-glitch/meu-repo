/**
 * Letter bt — Radiance wiring honesty (Zero-MVP).
 * Frame hooks / Capability Score degrade; HW RT claim always false; CLOUD HELD.
 */

import { describe, expect, it } from 'vitest'
import {
  RADIANCE_CAPABILITY_BUDGET_WIRED,
  estimateShadowVramMb,
  resolveRadianceCapabilityBudget,
} from '@/lib/radiance/radiance-capability-budget'
import { RADIANCE_FRAME_WIRED } from '@/lib/radiance/radiance-frame-wire'
import {
  probeRadianceWiringHonesty,
  proveRadianceCapabilityDegrade,
  RADIANCE_WIRING_LETTER,
} from '@/lib/radiance/radiance-honesty'
import { VOLUMETRIC_CLOUDS_SHIP_STATUS } from '@/lib/volumetric-clouds'

describe('Radiance capability budget (bt)', () => {
  it('wires budget + frame flags', () => {
    expect(RADIANCE_CAPABILITY_BUDGET_WIRED).toBe(true)
    expect(RADIANCE_FRAME_WIRED).toBe(true)
    expect(RADIANCE_WIRING_LETTER).toBe('bt')
  })

  it('GT730 / webgl2: fail-closed RT, tiny cascade, cheap clouds', () => {
    const b = proveRadianceCapabilityDegrade(12)
    expect(b.tier).toBe('webgl2')
    expect(b.rtInFrameAllowed).toBe(false)
    expect(b.hwRayTracingClaimAllowed).toBe(false)
    expect(b.shadowCascades).toBe(1)
    expect(b.shadowMapSize).toBe(512)
    expect(b.vsmAtlasSize).toBe(0)
    expect(b.cloudMaxSteps).toBe(8)
    expect(b.godRaysAllowed).toBe(false)
    expect(b.depthBlendAllowed).toBe(true)
    expect(b.estimatedShadowVramMb).toBeLessThan(8)
  })

  it('integrated: software RT low-res, cascade no VSM', () => {
    const b = resolveRadianceCapabilityBudget(30)
    expect(b.tier).toBe('integrated')
    expect(b.rtInFrameAllowed).toBe(true)
    expect(b.rtResolution).toBeLessThanOrEqual(0.35)
    expect(b.vsmAtlasSize).toBe(0)
    expect(b.shadowTechnique).toBe('cascade')
    expect(b.cloudMaxSteps).toBe(16)
  })

  it('discrete: cascade+VSM hybrid without melting VRAM', () => {
    const b = resolveRadianceCapabilityBudget(55)
    expect(b.tier).toBe('discrete')
    expect(b.shadowTechnique).toBe('cascade-vsm-hybrid')
    expect(b.vsmAtlasSize).toBe(1024)
    expect(b.estimatedShadowVramMb).toBeLessThanOrEqual(64)
    expect(estimateShadowVramMb(4, 2048, 2048)).toBeGreaterThan(b.estimatedShadowVramMb)
  })

  it('never allows HW RT claim at any score', () => {
    for (const s of [0, 15, 38, 62, 90, 100]) {
      expect(resolveRadianceCapabilityBudget(s).hwRayTracingClaimAllowed).toBe(false)
    }
  })
})

describe('Radiance wiring honesty (bt)', () => {
  it('does not prove frame hooks without real ticks', () => {
    const probe = probeRadianceWiringHonesty({
      capabilityScore: 30,
      framesWithHooks: 0,
      rtInFrameLoop: false,
      cloudsInFrameLoop: false,
      shadowsInFrameLoop: false,
      bvhModulePresent: true,
      denoiserModulePresent: true,
    })
    expect(probe.wired).toBe(true)
    expect(probe.frameHooksProven).toBe(false)
    expect(probe.marketingRadianceGiAllowed).toBe(false)
    expect(probe.cloudShipStatus).toBe(VOLUMETRIC_CLOUDS_SHIP_STATUS)
    expect(probe.cloudShipStatus).toBe('CLOSED')
    expect(probe.marketingFullVolumetricAaaAllowed).toBe(false)
  })

  it('proves hooks when frames ran with cloud/shadow participation', () => {
    const probe = probeRadianceWiringHonesty({
      capabilityScore: 30,
      framesWithHooks: 3,
      rtInFrameLoop: true,
      cloudsInFrameLoop: true,
      shadowsInFrameLoop: true,
      bvhModulePresent: true,
      denoiserModulePresent: true,
    })
    expect(probe.frameHooksProven).toBe(true)
    expect(probe.rayTracingInFrameLoop).toBe(true)
    expect(probe.hwRayTracingClaimAllowed).toBe(false)
  })

  it('webgl2 RT stay fail-closed even if caller claims rtInFrameLoop', () => {
    const probe = probeRadianceWiringHonesty({
      capabilityScore: 10,
      framesWithHooks: 1,
      rtInFrameLoop: true,
      cloudsInFrameLoop: true,
      shadowsInFrameLoop: true,
      bvhModulePresent: true,
      denoiserModulePresent: true,
    })
    expect(probe.budget.rtInFrameAllowed).toBe(false)
    expect(probe.rayTracingInFrameLoop).toBe(false)
    expect(probe.notes.some((n) => n.includes('fail-closed'))).toBe(true)
  })
})

describe('Adaptive volumetric steps (bt)', () => {
  it('scales cloud steps with Capability Score', () => {
    expect(resolveRadianceCapabilityBudget(10).cloudMaxSteps).toBe(8)
    expect(resolveRadianceCapabilityBudget(30).cloudMaxSteps).toBe(16)
    expect(resolveRadianceCapabilityBudget(55).cloudMaxSteps).toBe(32)
    expect(resolveRadianceCapabilityBudget(80).cloudMaxSteps).toBe(64)
  })
})
