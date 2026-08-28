/**
 * Letter cf — Radiance viewport enable path (Zero-MVP).
 *
 * bt/by built RadianceFrameWire + enableRadiance but left zero real callers.
 * This module is the real wire into AAARenderer / GameLoop / studio R3F viewport
 * so Radiance participates in the live frame. Law XV GT730 degrade; Zero-UI
 * when RT/god-rays fail-closed — never invent HW RT / Lumen marketing.
 */

import type * as THREE from 'three'
import type { AAARenderer } from '@/lib/aaa-renderer-impl'
import {
  createRadianceFrameWire,
  type RadianceFrameWire,
} from '@/lib/radiance/radiance-frame-wire'
import {
  resolveRadianceCapabilityBudget,
  type RadianceCapabilityBudget,
} from '@/lib/radiance/radiance-capability-budget'

export const RADIANCE_VIEWPORT_ENABLE_LETTER = 'cf' as const
export const RADIANCE_VIEWPORT_ENABLE_WIRED = true as const
/** Studio R3F browser viewport participates in Radiance frame (cf). */
export const RADIANCE_STUDIO_VIEWPORT_WIRED = true as const

/** Default web Capability Score when caller has no probe (honest WebGL2-ish ceiling). */
export const RADIANCE_VIEWPORT_DEFAULT_CAPABILITY_SCORE = 38

export interface EnableRadianceOnRendererOptions {
  capabilityScore?: number
  /** Explicit software RT opt-in. Default true; budget still fail-closes on weak GPU. */
  rayTracingOptIn?: boolean
  /**
   * When false, skip enable (tests / opt-out). Default true — Zero-UI auto-wire.
   */
  radianceRequested?: boolean
}

export interface RadianceViewportEnableResult {
  letter: typeof RADIANCE_VIEWPORT_ENABLE_LETTER
  enabled: boolean
  wire: RadianceFrameWire | null
  budget: RadianceCapabilityBudget
  /** True when weak-GPU path kept beauty/RT off without mounting chrome. */
  zeroUiFailClosed: boolean
  rtInFrameAllowed: boolean
  godRaysAllowed: boolean
  hwRayTracingClaimAllowed: false
  marketingRadianceGiAllowed: false
  notes: string[]
  /** Which live path enabled Radiance (cf honesty). */
  enablePath: 'aaa-renderer' | 'studio-gl' | 'skipped'
}

function clampCapabilityScore(score: number | undefined): number {
  return Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score as number)))
    : RADIANCE_VIEWPORT_DEFAULT_CAPABILITY_SCORE
}

function buildSkippedResult(
  budget: RadianceCapabilityBudget,
  notes: string[],
): RadianceViewportEnableResult {
  return {
    letter: RADIANCE_VIEWPORT_ENABLE_LETTER,
    enabled: false,
    wire: null,
    budget,
    zeroUiFailClosed: true,
    rtInFrameAllowed: budget.rtInFrameAllowed,
    godRaysAllowed: budget.godRaysAllowed,
    hwRayTracingClaimAllowed: false,
    marketingRadianceGiAllowed: false,
    notes,
    enablePath: 'skipped',
  }
}

function finalizeEnabledResult(
  wire: RadianceFrameWire,
  budget: RadianceCapabilityBudget,
  notes: string[],
  enablePath: 'aaa-renderer' | 'studio-gl',
): RadianceViewportEnableResult {
  const zeroUiFailClosed =
    budget.tier === 'webgl2' ||
    (!budget.rtInFrameAllowed && !budget.godRaysAllowed)

  if (zeroUiFailClosed) {
    notes.push(
      'Zero-UI: weak GPU — RT/god-rays fail-closed; clouds/shadows may still run under budget',
    )
  }
  if (!budget.rtInFrameAllowed) {
    notes.push('software RT not in frame (Law XV)')
  }

  return {
    letter: RADIANCE_VIEWPORT_ENABLE_LETTER,
    enabled: true,
    wire,
    budget,
    zeroUiFailClosed,
    rtInFrameAllowed: budget.rtInFrameAllowed,
    godRaysAllowed: budget.godRaysAllowed,
    hwRayTracingClaimAllowed: false,
    marketingRadianceGiAllowed: false,
    notes,
    enablePath,
  }
}

/**
 * Real caller into AAARenderer.enableRadiance — GameLoop / useRenderPipeline / playtest.
 */
export function enableRadianceOnRenderer(
  renderer: AAARenderer,
  opts: EnableRadianceOnRendererOptions = {},
): RadianceViewportEnableResult {
  const score = clampCapabilityScore(opts.capabilityScore)
  const budget = resolveRadianceCapabilityBudget(score)
  const notes: string[] = [
    `letter ${RADIANCE_VIEWPORT_ENABLE_LETTER}: viewport enable → AAARenderer.enableRadiance`,
    ...budget.notes,
  ]

  if (opts.radianceRequested === false) {
    notes.push('radianceRequested=false — enable skipped (opt-out)')
    return buildSkippedResult(budget, notes)
  }

  const wire = renderer.enableRadiance(score, {
    rayTracingOptIn: opts.rayTracingOptIn !== false,
  })

  return finalizeEnabledResult(wire, budget, notes, 'aaa-renderer')
}

/**
 * Studio R3F path — wire RadianceFrameWire onto the live WebGLRenderer/scene/camera
 * (AethelViewport3D → ViewportSceneCanvas). Zero-UI when Law XV fail-closes beauty.
 */
export function enableRadianceOnGlContext(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  opts: EnableRadianceOnRendererOptions = {},
): RadianceViewportEnableResult {
  const score = clampCapabilityScore(opts.capabilityScore)
  const budget = resolveRadianceCapabilityBudget(score)
  const notes: string[] = [
    `letter ${RADIANCE_VIEWPORT_ENABLE_LETTER}: studio R3F enable → RadianceFrameWire`,
    ...budget.notes,
  ]

  if (opts.radianceRequested === false) {
    notes.push('radianceRequested=false — studio enable skipped (opt-out)')
    return buildSkippedResult(budget, notes)
  }

  const wire = createRadianceFrameWire(renderer, scene, camera, {
    capabilityScore: score,
    rayTracingOptIn: opts.rayTracingOptIn !== false,
    cloudsOptIn: true,
    shadowsOptIn: true,
  })

  return finalizeEnabledResult(wire, budget, notes, 'studio-gl')
}

/** Pure plan for Vitest — no WebGL. */
export function planRadianceViewportEnable(input: {
  capabilityScore?: number
  radianceRequested?: boolean
  /** Prefer studio-gl path marker in notes (cf). */
  studioGl?: boolean
}): Omit<RadianceViewportEnableResult, 'wire'> & { wouldCallEnableRadiance: boolean } {
  const score = clampCapabilityScore(input.capabilityScore)
  const budget = resolveRadianceCapabilityBudget(score)
  const requested = input.radianceRequested !== false
  const zeroUiFailClosed =
    budget.tier === 'webgl2' ||
    (!budget.rtInFrameAllowed && !budget.godRaysAllowed)
  const enablePath = !requested
    ? 'skipped'
    : input.studioGl
      ? 'studio-gl'
      : 'aaa-renderer'

  return {
    letter: RADIANCE_VIEWPORT_ENABLE_LETTER,
    enabled: requested,
    wouldCallEnableRadiance: requested,
    budget,
    zeroUiFailClosed: requested ? zeroUiFailClosed : true,
    rtInFrameAllowed: budget.rtInFrameAllowed,
    godRaysAllowed: budget.godRaysAllowed,
    hwRayTracingClaimAllowed: false,
    marketingRadianceGiAllowed: false,
    enablePath,
    notes: [
      `letter ${RADIANCE_VIEWPORT_ENABLE_LETTER}: plan only`,
      ...budget.notes,
      requested
        ? input.studioGl
          ? 'would call enableRadianceOnGlContext (studio R3F)'
          : 'would call enableRadiance'
        : 'opt-out',
    ],
  }
}
