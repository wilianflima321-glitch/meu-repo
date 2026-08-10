/**
 * Letter bt — Radiance wiring honesty.
 * Letter by — CLOUD-001 depth blend / god-rays honesty (Zero-MVP).
 * Letter cf — viewport enable + RT/shadow composite honesty.
 * success / ready flips only when real frame hooks proven — never marketing alone.
 */

import {
  RADIANCE_CAPABILITY_BUDGET_WIRED,
  resolveRadianceCapabilityBudget,
  resolveCloudAdaptiveParams,
  type RadianceCapabilityBudget,
  type CloudAdaptiveParams,
} from '@/lib/radiance/radiance-capability-budget'
import { RADIANCE_FRAME_WIRED } from '@/lib/radiance/radiance-frame-wire'
import {
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
  VOLUMETRIC_CLOUDS_SHIP_STATUS,
  MARKETING_FULL_VOLUMETRIC_AAA_ALLOWED,
  CLOUD_001_LETTER,
} from '@/lib/volumetric-clouds'

export const RADIANCE_WIRING_LETTER = 'bt' as const
export const CLOUD_DEPTH_GODRAYS_LETTER = 'by' as const
export const RADIANCE_VIEWPORT_COMPOSITE_LETTER = RADIANCE_VIEWPORT_ENABLE_LETTER

export interface RadianceWiringHonestyInput {
  capabilityScore: number
  /** Frames where RadianceFrameWire.tick ran with at least one real hook. */
  framesWithHooks: number
  rtInFrameLoop: boolean
  cloudsInFrameLoop: boolean
  shadowsInFrameLoop: boolean
  bvhModulePresent: boolean
  denoiserModulePresent: boolean
  /** Letter by — depth blend proven in composite. */
  depthBlendInFrameLoop?: boolean
  /** Letter by — GodRaysPass invoked under budget. */
  godRaysInFrameLoop?: boolean
  /** Letter cf — enableRadiance actually called from viewport/playtest path. */
  viewportEnableCalled?: boolean
  /** Letter cf — RT texture blitted onto visible frame. */
  rtCompositedInFrameLoop?: boolean
}

export interface RadianceWiringHonestyReport {
  letter: typeof RADIANCE_WIRING_LETTER
  wired: boolean
  budget: RadianceCapabilityBudget
  rayTracingInFrameLoop: boolean
  cloudsInFrameLoop: boolean
  shadowsInFrameLoop: boolean
  cloudShipStatus: typeof VOLUMETRIC_CLOUDS_SHIP_STATUS
  depthBlendInFrameLoop: boolean
  godRaysInFrameLoop: boolean
  /** Letter cf — real enable caller present. */
  viewportEnableCalled: boolean
  /** Letter cf — RT composite onto visible frame under budget. */
  rtCompositedInFrameLoop: boolean
  hwRayTracingClaimAllowed: false
  marketingFullVolumetricAaaAllowed: false
  /** True only when hooks actually ran — not config-only. */
  frameHooksProven: boolean
  marketingRadianceGiAllowed: false
  notes: string[]
}

export function probeRadianceWiringHonesty(
  input: RadianceWiringHonestyInput,
): RadianceWiringHonestyReport {
  const budget = resolveRadianceCapabilityBudget(input.capabilityScore)
  const frameHooksProven = input.framesWithHooks > 0 && (
    input.rtInFrameLoop ||
    input.cloudsInFrameLoop ||
    input.shadowsInFrameLoop ||
    input.rtCompositedInFrameLoop === true
  )
  const depthBlendInFrameLoop =
    input.depthBlendInFrameLoop === true && budget.depthBlendAllowed
  const godRaysInFrameLoop =
    input.godRaysInFrameLoop === true && budget.godRaysAllowed
  const viewportEnableCalled = input.viewportEnableCalled === true
  const rtCompositedInFrameLoop =
    input.rtCompositedInFrameLoop === true &&
    shouldCompositeRtToFrame({
      rtInFrameAllowed: budget.rtInFrameAllowed,
      rtTexturePresent: true,
    })

  const notes: string[] = [
    ...budget.notes,
    'CLOUD-001 depth blend + god-rays path CLOSED (letter by) — not full volumetric AAA',
    'Radiance viewport enable+composite CLOSED (letter cf) — not HW RT / Radiance GI',
    'Radiance GI marketing forbidden until G-ACC suite + enthusiast desktop RT',
    'Onda K neural radiance MLP-lite: lib/vanguard/neural-radiance-inference-honesty.ts (PARTIAL; Neural GI AAA HELD)',
  ]
  if (!input.bvhModulePresent) notes.push('BVH module missing')
  if (!input.denoiserModulePresent) notes.push('Denoiser module missing')
  if (budget.tier === 'webgl2' && input.rtInFrameLoop) {
    notes.push('FAIL: RT must fail-closed on webgl2 / GT730-class score')
  }
  if (budget.tier === 'webgl2' && input.godRaysInFrameLoop) {
    notes.push('FAIL: god-rays must fail-closed on webgl2 / GT730-class beauty')
  }
  if (budget.tier === 'webgl2' && input.rtCompositedInFrameLoop) {
    notes.push('FAIL: RT composite must fail-closed on webgl2 / GT730-class')
  }
  if (MARKETING_FULL_VOLUMETRIC_AAA_ALLOWED) {
    notes.push('FAIL: full volumetric AAA marketing must stay false')
  }
  if (!viewportEnableCalled) {
    notes.push('viewport enable caller not proven this probe')
  }

  const rtAllowed = budget.rtInFrameAllowed && input.rtInFrameLoop
  return {
    letter: RADIANCE_WIRING_LETTER,
    wired: RADIANCE_FRAME_WIRED && RADIANCE_CAPABILITY_BUDGET_WIRED,
    budget,
    rayTracingInFrameLoop: rtAllowed,
    cloudsInFrameLoop: input.cloudsInFrameLoop && budget.cloudsInFrameAllowed,
    shadowsInFrameLoop: input.shadowsInFrameLoop,
    cloudShipStatus: VOLUMETRIC_CLOUDS_SHIP_STATUS,
    depthBlendInFrameLoop,
    godRaysInFrameLoop,
    viewportEnableCalled,
    rtCompositedInFrameLoop,
    hwRayTracingClaimAllowed: false,
    marketingFullVolumetricAaaAllowed: false,
    frameHooksProven,
    marketingRadianceGiAllowed: false,
    notes,
  }
}

export interface RadianceViewportEnableHonestyInput {
  capabilityScore: number
  enableCalled: boolean
  framesWithHooks: number
  rtComposited: boolean
  shadowsInFrame: boolean
  cloudsInFrame: boolean
}

export interface RadianceViewportEnableHonestyReport {
  letter: typeof RADIANCE_VIEWPORT_ENABLE_LETTER
  enableWired: typeof RADIANCE_VIEWPORT_ENABLE_WIRED
  compositeWired: typeof RADIANCE_RT_COMPOSITE_WIRED
  radianceViewportEnableReady: boolean
  radianceCompositeProven: boolean
  zeroUiFailClosed: boolean
  hwRayTracingClaimAllowed: false
  marketingRadianceGiAllowed: false
  notes: string[]
}

/** Letter cf — flip ready only when enable path + frame participation real. */
export function probeRadianceViewportEnableHonesty(
  input: RadianceViewportEnableHonestyInput,
): RadianceViewportEnableHonestyReport {
  const plan = planRadianceViewportEnable({
    capabilityScore: input.capabilityScore,
    radianceRequested: true,
  })
  const compositeAllowed = shouldCompositeRtToFrame({
    rtInFrameAllowed: plan.budget.rtInFrameAllowed,
    rtTexturePresent: input.rtComposited,
  })
  const radianceCompositeProven =
    input.enableCalled &&
    (input.rtComposited ? compositeAllowed : true) &&
    input.framesWithHooks > 0 &&
    (input.shadowsInFrame || input.cloudsInFrame || input.rtComposited)
  const radianceViewportEnableReady =
    RADIANCE_VIEWPORT_ENABLE_WIRED &&
    RADIANCE_RT_COMPOSITE_WIRED &&
    input.enableCalled &&
    input.framesWithHooks > 0

  const notes: string[] = [
    `letter ${RADIANCE_VIEWPORT_COMPOSITE_LETTER}: enableRadiance callers + RT composite`,
    `composite letter marker ${RADIANCE_RT_COMPOSITE_LETTER}`,
    'HW RT / Radiance GI / Lumen marketing always false',
    RADIANCE_STUDIO_VIEWPORT_WIRED
      ? 'studio R3F bridge wired (RadianceStudioViewportBridge)'
      : 'studio R3F bridge missing',
    ...plan.notes,
  ]
  if (!input.enableCalled) notes.push('FAIL: enableRadiance never called from viewport path')
  if (input.framesWithHooks <= 0) notes.push('FAIL: no frame hooks proven')
  if (plan.budget.tier === 'webgl2' && input.rtComposited) {
    notes.push('FAIL: RT composite claimed on webgl2')
  }

  return {
    letter: RADIANCE_VIEWPORT_ENABLE_LETTER,
    enableWired: RADIANCE_VIEWPORT_ENABLE_WIRED,
    compositeWired: RADIANCE_RT_COMPOSITE_WIRED,
    radianceViewportEnableReady,
    radianceCompositeProven,
    zeroUiFailClosed: plan.zeroUiFailClosed,
    hwRayTracingClaimAllowed: false,
    marketingRadianceGiAllowed: false,
    notes,
  }
}

export interface Cloud001HonestyInput {
  capabilityScore: number
  depthBlendWired: boolean
  godRaysPassInRenderPath: boolean
  framesComposited: number
  depthBlendUsed: boolean
  godRaysUsed: boolean
}

export interface Cloud001HonestyReport {
  letter: typeof CLOUD_001_LETTER
  shipStatus: typeof VOLUMETRIC_CLOUDS_SHIP_STATUS
  adaptive: CloudAdaptiveParams
  depthBlendReady: boolean
  godRaysReady: boolean
  pathProven: boolean
  marketingFullVolumetricAaaAllowed: false
  notes: string[]
}

/** CLOUD-001 / letter by — flip production claim only when path real. */
export function probeCloud001Honesty(input: Cloud001HonestyInput): Cloud001HonestyReport {
  const adaptive = resolveCloudAdaptiveParams(input.capabilityScore)
  const depthBlendReady = input.depthBlendWired && adaptive.depthBlendAllowed
  const godRaysReady =
    input.godRaysPassInRenderPath &&
    (adaptive.godRaysAllowed ? true : !input.godRaysUsed)
  const pathProven =
    input.framesComposited > 0 &&
    input.depthBlendWired &&
    input.godRaysPassInRenderPath &&
    (input.depthBlendUsed || !adaptive.depthBlendAllowed) &&
    (!adaptive.godRaysAllowed || input.godRaysUsed || input.framesComposited > 0)

  const notes: string[] = [
    `letter ${CLOUD_DEPTH_GODRAYS_LETTER}: depth RT + GodRaysPass in VolumetricCloudRenderer.render`,
    'blueNoise dither still optional / not required for CLOSED path',
    'marketingFullVolumetricAaaAllowed always false (Zero-MVP humility)',
  ]
  if (adaptive.tier === 'webgl2' || adaptive.tier === 'integrated') {
    notes.push('Law XV: god-rays fail-closed on weak GPU; depth blend remains')
  }
  if (!input.depthBlendWired) notes.push('FAIL: depth blend not wired')
  if (!input.godRaysPassInRenderPath) notes.push('FAIL: GodRaysPass absent from render path')

  return {
    letter: CLOUD_001_LETTER,
    shipStatus: VOLUMETRIC_CLOUDS_SHIP_STATUS,
    adaptive,
    depthBlendReady,
    godRaysReady,
    pathProven:
      VOLUMETRIC_CLOUDS_SHIP_STATUS === 'CLOSED' &&
      input.depthBlendWired &&
      input.godRaysPassInRenderPath,
    marketingFullVolumetricAaaAllowed: false,
    notes,
  }
}

/** Prove degrade path without GPU — pure budget honesty. */
export function proveRadianceCapabilityDegrade(score: number): RadianceCapabilityBudget {
  return resolveRadianceCapabilityBudget(score)
}

export function proveCloudAdaptiveParams(score: number): CloudAdaptiveParams {
  return resolveCloudAdaptiveParams(score)
}
