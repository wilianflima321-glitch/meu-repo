/**
 * Letter ci — FSR / spatial upscale wire into AAARenderer frame (Law XV).
 * CapScore selects internalScale; composer renders sub-res → Present stretches.
 * Zero-UI when upscale unavailable (native / opt-out). DLSS always HELD.
 */

import type { AAARenderer } from '@/lib/aaa-renderer-impl'
import {
  FSR_SRG_LETTER,
  FSR_SRG_WIRED,
  proveFsrSrgWire,
} from '@/lib/hardware/fsr-srg-honesty'
import {
  resolveFsrSrgExecutorPlan,
  resolveInternalPresentSize,
  type FsrSrgExecutorPlan,
} from '@aethel/engine/render/scalable-render-graph'

export const FSR_FRAME_WIRE_LETTER = FSR_SRG_LETTER
export const FSR_FRAME_WIRE_WIRED = FSR_SRG_WIRED
export const FSR_VIEWPORT_DEFAULT_CAPABILITY_SCORE = 38

export interface EnableFsrOnRendererOptions {
  capabilityScore?: number
  /** When false, skip enable (tests / opt-out). Default true. */
  fsrRequested?: boolean
}

export interface FsrFrameWireEnableResult {
  letter: typeof FSR_FRAME_WIRE_LETTER
  enabled: boolean
  plan: FsrSrgExecutorPlan
  zeroUiFailClosed: boolean
  upscaleActive: boolean
  dlssNativeAllowed: false
  enablePath: 'aaa-renderer' | 'skipped'
  notes: string[]
}

function clampCapabilityScore(score: number | undefined): number {
  return Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score as number)))
    : FSR_VIEWPORT_DEFAULT_CAPABILITY_SCORE
}

/**
 * Apply CapScore FSR plan to AAARenderer composer internal size.
 * When upscale inactive (native) — Zero-UI, no special chrome.
 */
export function enableFsrOnRenderer(
  renderer: AAARenderer,
  opts: EnableFsrOnRendererOptions = {},
): FsrFrameWireEnableResult {
  const score = clampCapabilityScore(opts.capabilityScore)
  const plan = resolveFsrSrgExecutorPlan({ capabilityScore: score })
  const notes: string[] = [
    `letter ${FSR_FRAME_WIRE_LETTER}: frame wire → AAARenderer.enableFsrUpscale`,
    ...plan.notes,
  ]

  if (opts.fsrRequested === false) {
    notes.push('fsrRequested=false — enable skipped (opt-out)')
    return {
      letter: FSR_FRAME_WIRE_LETTER,
      enabled: false,
      plan,
      zeroUiFailClosed: true,
      upscaleActive: false,
      dlssNativeAllowed: false,
      enablePath: 'skipped',
      notes,
    }
  }

  renderer.enableFsrUpscale(score)
  // Soak evidence for honesty probe (CPU spatial + SRG registration).
  proveFsrSrgWire(score)

  if (!plan.upscaleActive) {
    notes.push('Zero-UI: native CapScore — composer stays present size')
  }

  return {
    letter: FSR_FRAME_WIRE_LETTER,
    enabled: true,
    plan,
    zeroUiFailClosed: !plan.upscaleActive,
    upscaleActive: plan.upscaleActive,
    dlssNativeAllowed: false,
    enablePath: 'aaa-renderer',
    notes,
  }
}

/** Pure plan for Vitest — no WebGL. */
export function planFsrFrameEnable(input: {
  capabilityScore?: number
  fsrRequested?: boolean
  presentWidth?: number
  presentHeight?: number
}): Omit<FsrFrameWireEnableResult, 'enablePath'> & {
  wouldCallEnableFsr: boolean
  enablePath: 'aaa-renderer' | 'skipped'
  internalWidth: number
  internalHeight: number
} {
  const score = clampCapabilityScore(input.capabilityScore)
  const plan = resolveFsrSrgExecutorPlan({ capabilityScore: score })
  const requested = input.fsrRequested !== false
  const presentWidth = input.presentWidth ?? 1280
  const presentHeight = input.presentHeight ?? 720
  const { internalWidth, internalHeight } = resolveInternalPresentSize(
    presentWidth,
    presentHeight,
    plan.internalScale,
  )

  return {
    letter: FSR_FRAME_WIRE_LETTER,
    enabled: requested,
    wouldCallEnableFsr: requested,
    plan,
    zeroUiFailClosed: requested ? !plan.upscaleActive : true,
    upscaleActive: requested && plan.upscaleActive,
    dlssNativeAllowed: false,
    enablePath: requested ? 'aaa-renderer' : 'skipped',
    internalWidth,
    internalHeight,
    notes: [
      `letter ${FSR_FRAME_WIRE_LETTER}: plan only`,
      ...plan.notes,
      requested ? 'would call enableFsrUpscale' : 'opt-out',
    ],
  }
}
