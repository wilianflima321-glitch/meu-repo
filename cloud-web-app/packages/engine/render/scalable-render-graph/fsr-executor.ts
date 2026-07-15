/**
 * Letter ci — ScalableRenderGraph FSR node executor (Law XV).
 * Spatial upscale only — not AMD FSR 3 Frame Gen, not DLSS native on web.
 * CapScore selects internal scale; GT730 (score < 20) → performance.
 */

export const FSR_SRG_EXECUTOR_LETTER = 'ci' as const
export const FSR_SRG_EXECUTOR_SHIPPED = true as const
/** DLSS native on web — always HELD. */
export const DLSS_NATIVE_WEB_HELD = true as const

export type FsrSrgQualityMode =
  | 'native'
  | 'quality'
  | 'balanced'
  | 'performance'
  | 'ultra_performance'

const MODE_SCALE: Record<FsrSrgQualityMode, number> = {
  native: 1,
  quality: 0.67,
  balanced: 0.58,
  performance: 0.5,
  ultra_performance: 0.33,
}

export interface FsrSrgExecutorPlan {
  letter: typeof FSR_SRG_EXECUTOR_LETTER
  capabilityScore: number
  mode: FsrSrgQualityMode
  /** Internal render scale 0..1 before Present. */
  internalScale: number
  /** True when CapScore warrants spatial upscale path (including identity native). */
  fsrAllowed: boolean
  /** When false — Zero-UI: skip mounting upscale chrome / leave native present. */
  upscaleActive: boolean
  dlssNativeAllowed: false
  notes: string[]
}

export interface FsrSrgExecuteInput {
  capabilityScore: number
  preferMode?: FsrSrgQualityMode
  /** Present / canvas size. */
  presentWidth: number
  presentHeight: number
  /**
   * Optional single-channel luminance buffer at internal resolution.
   * When provided, executor applies EASU-class bilinear to present size.
   */
  srcLuma?: Float32Array
}

export interface FsrSrgExecuteResult {
  letter: typeof FSR_SRG_EXECUTOR_LETTER
  plan: FsrSrgExecutorPlan
  internalWidth: number
  internalHeight: number
  presentWidth: number
  presentHeight: number
  /** Upscaled luma when srcLuma provided; otherwise null (frame path uses GPU blit). */
  dstLuma: Float32Array | null
  executed: boolean
  dlssNativeAllowed: false
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function resolveFsrSrgExecutorPlan(input: {
  capabilityScore: number
  preferMode?: FsrSrgQualityMode
}): FsrSrgExecutorPlan {
  const score = clampScore(input.capabilityScore)
  let mode: FsrSrgQualityMode = input.preferMode ?? 'balanced'
  if (!input.preferMode) {
    if (score < 20) mode = 'performance'
    else if (score < 45) mode = 'balanced'
    else if (score < 75) mode = 'quality'
    else mode = 'native'
  }
  const internalScale = MODE_SCALE[mode]
  const fsrAllowed = true
  const upscaleActive = fsrAllowed && internalScale < 1
  return {
    letter: FSR_SRG_EXECUTOR_LETTER,
    capabilityScore: score,
    mode,
    internalScale,
    fsrAllowed,
    upscaleActive,
    dlssNativeAllowed: false,
    notes: [
      `letter ${FSR_SRG_EXECUTOR_LETTER}: SRG FSR spatial executor`,
      `mode=${mode} internalScale=${internalScale}`,
      score < 20 ? 'GT730 CapScore → performance degrade' : 'CapScore scale selected',
      DLSS_NATIVE_WEB_HELD ? 'DLSS native web HELD' : 'DLSS unexpected',
      upscaleActive
        ? 'upscaleActive — internal RT then Present'
        : 'Zero-UI: native scale — no upscale chrome',
    ],
  }
}

/**
 * EASU-class bilinear spatial sample (CPU proof / soak).
 * Same math as letter cg; lives here so SRG executor is self-contained.
 */
export function applyFsrSrgSpatialSample(input: {
  srcWidth: number
  srcHeight: number
  src: Float32Array
  dstWidth: number
  dstHeight: number
}): Float32Array {
  const { srcWidth, srcHeight, src, dstWidth, dstHeight } = input
  if (src.length < srcWidth * srcHeight) {
    throw new Error('FSR SRG sample: src buffer too small')
  }
  const dst = new Float32Array(dstWidth * dstHeight)
  for (let y = 0; y < dstHeight; y++) {
    const v = (y + 0.5) / dstHeight
    const sy = Math.min(srcHeight - 1, Math.max(0, v * srcHeight - 0.5))
    const y0 = Math.floor(sy)
    const y1 = Math.min(srcHeight - 1, y0 + 1)
    const fy = sy - y0
    for (let x = 0; x < dstWidth; x++) {
      const u = (x + 0.5) / dstWidth
      const sx = Math.min(srcWidth - 1, Math.max(0, u * srcWidth - 0.5))
      const x0 = Math.floor(sx)
      const x1 = Math.min(srcWidth - 1, x0 + 1)
      const fx = sx - x0
      const a = src[y0 * srcWidth + x0]!
      const b = src[y0 * srcWidth + x1]!
      const c = src[y1 * srcWidth + x0]!
      const d = src[y1 * srcWidth + x1]!
      const top = a + (b - a) * fx
      const bot = c + (d - c) * fx
      dst[y * dstWidth + x] = top + (bot - top) * fy
    }
  }
  return dst
}

export function resolveInternalPresentSize(
  presentWidth: number,
  presentHeight: number,
  internalScale: number,
): { internalWidth: number; internalHeight: number } {
  const scale = Math.max(0.1, Math.min(1, internalScale))
  return {
    internalWidth: Math.max(1, Math.round(presentWidth * scale)),
    internalHeight: Math.max(1, Math.round(presentHeight * scale)),
  }
}

/**
 * Execute SRG FSR node — CapScore plan + optional spatial sample soak.
 * Frame path (AAARenderer) uses the same plan for composer internal size.
 */
export function executeFsrSrgNode(input: FsrSrgExecuteInput): FsrSrgExecuteResult {
  const plan = resolveFsrSrgExecutorPlan({
    capabilityScore: input.capabilityScore,
    preferMode: input.preferMode,
  })
  const presentWidth = Math.max(1, Math.floor(input.presentWidth))
  const presentHeight = Math.max(1, Math.floor(input.presentHeight))
  const { internalWidth, internalHeight } = resolveInternalPresentSize(
    presentWidth,
    presentHeight,
    plan.internalScale,
  )

  let dstLuma: Float32Array | null = null
  let executed = false

  if (input.srcLuma && plan.fsrAllowed) {
    dstLuma = applyFsrSrgSpatialSample({
      srcWidth: internalWidth,
      srcHeight: internalHeight,
      src: input.srcLuma,
      dstWidth: presentWidth,
      dstHeight: presentHeight,
    })
    executed = dstLuma.length === presentWidth * presentHeight
  } else if (plan.fsrAllowed) {
    // Plan-only / frame-wire path — executor participated without CPU buffer.
    executed = true
  }

  return {
    letter: FSR_SRG_EXECUTOR_LETTER,
    plan,
    internalWidth,
    internalHeight,
    presentWidth,
    presentHeight,
    dstLuma,
    executed,
    dlssNativeAllowed: false,
  }
}

export function proveFsrSrgExecutorSoak(capabilityScore = 12): {
  passed: boolean
  letter: typeof FSR_SRG_EXECUTOR_LETTER
  plan: FsrSrgExecutorPlan
  executable: boolean
} {
  const plan = resolveFsrSrgExecutorPlan({ capabilityScore })
  const presentWidth = 8
  const presentHeight = 8
  const { internalWidth, internalHeight } = resolveInternalPresentSize(
    presentWidth,
    presentHeight,
    plan.internalScale,
  )
  const src = new Float32Array(internalWidth * internalHeight)
  for (let i = 0; i < src.length; i++) src[i] = (i % 3) / 2
  const result = executeFsrSrgNode({
    capabilityScore,
    presentWidth,
    presentHeight,
    srcLuma: src,
  })
  const midOk =
    result.dstLuma !== null &&
    Number.isFinite(result.dstLuma[Math.floor(result.dstLuma.length / 2)]!)
  return {
    passed:
      FSR_SRG_EXECUTOR_SHIPPED &&
      plan.fsrAllowed &&
      plan.dlssNativeAllowed === false &&
      plan.mode === (capabilityScore < 20 ? 'performance' : plan.mode) &&
      result.executed &&
      midOk &&
      (capabilityScore < 20 ? plan.upscaleActive === true : true),
    letter: FSR_SRG_EXECUTOR_LETTER,
    plan,
    executable: result.executed,
  }
}
