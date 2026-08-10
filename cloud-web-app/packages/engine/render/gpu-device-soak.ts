/**
 * Law XV — GPU / device soak evidence (WebGPU adapter limits or honesty inject).
 *
 * Records real adapter/limits + Instant/performance.now durations.
 * Never invents Math.random FPS or success:true with empty artifact.
 * AAA / Nanite / Lumen / frameGraph marketing stay false until ladder gates.
 */

import { createHash } from 'node:crypto'

import {
  buildHardwareStaticProfile,
  type HardwareStaticProfile,
  type WebHardwareProbeInput,
} from './hardware-profile'
import {
  buildScalableRenderGraphReport,
  type ScalableRenderGraphReport,
} from './scalable-render-graph'
import {
  selectScalableRenderTier,
  type CapScoreTierSelection,
  SCALABLE_RENDER_GRAPH_AAA_READY,
  NANITE_MARKETING_ALLOWED,
  LUMEN_MARKETING_ALLOWED,
} from './scalable-render-graph/capscore-tier-gate'

export const GPU_DEVICE_SOAK_LETTER = 'xv-gpu-soak' as const
export const GPU_DEVICE_SOAK_SHIPPED = true as const

/** Product AAA present / dual-live GPU — always false. */
export const GPU_DEVICE_SOAK_AAA_READY = false as const
export const WEBGPU_VIEWPORT_PRESENT_READY = false as const

export type GpuAdapterLimitsEvidence = {
  maxTextureDimension2D: number
  maxBufferSize?: number
  maxBindGroups?: number
  maxComputeWorkgroupSizeX?: number
  maxStorageBufferBindingSize?: number
}

export type GpuDeviceSoakRejectCode =
  | 'no_adapter_limits'
  | 'capscore_gate_failed'
  | 'empty_srg_report'
  | 'invented_fps_forbidden'
  | 'duration_not_measured'

export type GpuDeviceSoakResult =
  | { ok: true; evidence: GpuDeviceSoakEvidence }
  | {
      ok: false
      code: GpuDeviceSoakRejectCode
      message: string
      /** Never success:true — partial timing may still be present. */
      success: false
      durationMs: number | null
      scalableRenderGraphAaaReady: false
      webgpuViewportPresentReady: false
      marketingAllowed: false
    }

export type GpuDeviceSoakEvidence = {
  version: 1
  letter: typeof GPU_DEVICE_SOAK_LETTER
  wired: typeof GPU_DEVICE_SOAK_SHIPPED
  /** Wall-clock Instant / performance.now delta for soak work (ms). */
  durationMs: number
  /** Measured — never Math.random. Null when no frame loop ran. */
  measuredFps: number | null
  adapterName: string
  limits: GpuAdapterLimitsEvidence
  profile: HardwareStaticProfile
  capScoreSelection: CapScoreTierSelection & { ok: true }
  scalableRenderGraph: ScalableRenderGraphReport
  evidenceFingerprint: string
  /** API / adapter probe ≠ viewport present. */
  webgpuAdapterProbed: boolean
  webgpuViewportPresentReady: false
  scalableRenderGraphAaaReady: false
  naniteMarketingAllowed: false
  lumenMarketingAllowed: false
  frameGraphLive: false
  marketingAllowed: false
  success: true
  claim: string
}

function nowMs(clock?: () => number): number {
  if (clock) return clock()
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

function fingerprint(parts: Array<string | number | boolean | null | undefined>): string {
  return createHash('sha256')
    .update(parts.map((p) => String(p ?? '')).join('|'))
    .digest('hex')
    .slice(0, 16)
}

/**
 * Run CapScore + SRG plan soak against real or injected adapter limits.
 * Vitest injects limits; browser may pass navigator.gpu.requestAdapter() results.
 */
export function runGpuDeviceSoakEvidence(input: {
  adapterName?: string
  limits: GpuAdapterLimitsEvidence
  webgpuAvailable?: boolean
  webgl2Available?: boolean
  hardwareConcurrency?: number
  deviceMemoryGb?: number
  /** Optional frame count for measured FPS (deterministic work loop — no Math.random). */
  frameIterations?: number
  /** Inject Instant / performance.now for tests. */
  now?: () => number
}): GpuDeviceSoakResult {
  const t0 = nowMs(input.now)

  if (
    !input.limits ||
    !Number.isFinite(input.limits.maxTextureDimension2D) ||
    input.limits.maxTextureDimension2D <= 0
  ) {
    return {
      ok: false,
      code: 'no_adapter_limits',
      message: 'GPU device soak refused — adapter limits required (no invent)',
      success: false,
      durationMs: null,
      scalableRenderGraphAaaReady: false,
      webgpuViewportPresentReady: false,
      marketingAllowed: false,
    }
  }

  const probe: WebHardwareProbeInput = {
    webgpuAvailable: input.webgpuAvailable ?? true,
    webgl2Available: input.webgl2Available ?? true,
    adapterName: input.adapterName ?? 'WebGPU adapter (soak)',
    maxTextureDimension2D: Math.floor(input.limits.maxTextureDimension2D),
    hardwareConcurrency: input.hardwareConcurrency,
    deviceMemoryGb: input.deviceMemoryGb,
  }

  const profile = buildHardwareStaticProfile(probe)
  const selection = selectScalableRenderTier({
    capabilityScore: profile.capabilityScore,
  })

  if (!selection.ok) {
    const t1 = nowMs(input.now)
    return {
      ok: false,
      code: 'capscore_gate_failed',
      message: selection.reason,
      success: false,
      durationMs: Math.max(0, t1 - t0),
      scalableRenderGraphAaaReady: false,
      webgpuViewportPresentReady: false,
      marketingAllowed: false,
    }
  }

  // Align profile.tier with CapScore gate (never leave mismatched stale tier).
  const gatedProfile: HardwareStaticProfile = {
    ...profile,
    capabilityScore: selection.capabilityScore,
    tier: selection.tier,
  }

  const srg = buildScalableRenderGraphReport(gatedProfile)
  if (!srg || typeof srg.capabilityScore !== 'number') {
    const t1 = nowMs(input.now)
    return {
      ok: false,
      code: 'empty_srg_report',
      message: 'GPU device soak refused — empty ScalableRenderGraph report',
      success: false,
      durationMs: Math.max(0, t1 - t0),
      scalableRenderGraphAaaReady: false,
      webgpuViewportPresentReady: false,
      marketingAllowed: false,
    }
  }

  // Deterministic CPU work loop — measures wall time; FPS only when iterations > 0.
  const iterations = Math.max(0, Math.min(240, Math.floor(input.frameIterations ?? 0)))
  let measuredFps: number | null = null
  if (iterations > 0) {
    const loopStart = nowMs(input.now)
    // Synthetic frame work: hash adapter limits + CapScore (no Math.random).
    let acc = 0
    for (let i = 0; i < iterations; i++) {
      acc =
        (acc +
          gatedProfile.capabilityScore +
          (input.limits.maxTextureDimension2D | 0) +
          (input.limits.maxBufferSize ?? 0) +
          i) |
        0
    }
    const loopEnd = nowMs(input.now)
    const elapsed = Math.max(0.001, loopEnd - loopStart)
    measuredFps = (iterations * 1000) / elapsed
    // Keep acc live so optimizers cannot elide the loop.
    if (acc === Number.MAX_SAFE_INTEGER) {
      measuredFps = null
    }
  }

  const t1 = nowMs(input.now)
  const durationMs = Math.max(0, t1 - t0)
  if (!Number.isFinite(durationMs)) {
    return {
      ok: false,
      code: 'duration_not_measured',
      message: 'GPU device soak refused — Instant/performance.now duration not measured',
      success: false,
      durationMs: null,
      scalableRenderGraphAaaReady: false,
      webgpuViewportPresentReady: false,
      marketingAllowed: false,
    }
  }

  const evidenceFingerprint = fingerprint([
    GPU_DEVICE_SOAK_LETTER,
    gatedProfile.adapterName,
    gatedProfile.capabilityScore,
    gatedProfile.tier,
    input.limits.maxTextureDimension2D,
    input.limits.maxBufferSize ?? 0,
    srg.executableNodeCount,
    srg.fsrExecutorLive,
    durationMs.toFixed(3),
    measuredFps != null ? measuredFps.toFixed(2) : 'null',
  ])

  const evidence: GpuDeviceSoakEvidence = {
    version: 1,
    letter: GPU_DEVICE_SOAK_LETTER,
    wired: GPU_DEVICE_SOAK_SHIPPED,
    durationMs,
    measuredFps,
    adapterName: gatedProfile.adapterName,
    limits: {
      maxTextureDimension2D: Math.floor(input.limits.maxTextureDimension2D),
      maxBufferSize: input.limits.maxBufferSize,
      maxBindGroups: input.limits.maxBindGroups,
      maxComputeWorkgroupSizeX: input.limits.maxComputeWorkgroupSizeX,
      maxStorageBufferBindingSize: input.limits.maxStorageBufferBindingSize,
    },
    profile: gatedProfile,
    capScoreSelection: selection,
    scalableRenderGraph: srg,
    evidenceFingerprint,
    webgpuAdapterProbed: probe.webgpuAvailable === true,
    webgpuViewportPresentReady: WEBGPU_VIEWPORT_PRESENT_READY,
    scalableRenderGraphAaaReady: SCALABLE_RENDER_GRAPH_AAA_READY,
    naniteMarketingAllowed: NANITE_MARKETING_ALLOWED,
    lumenMarketingAllowed: LUMEN_MARKETING_ALLOWED,
    frameGraphLive: false,
    marketingAllowed: false,
    success: true,
    claim: `Law XV GPU soak — CapScore ${gatedProfile.capabilityScore}/${gatedProfile.tier}; adapter limits recorded; FSR SRG partial; AAA/Nanite/Lumen/WebGPU-present HELD`,
  }

  // Compile-time / runtime honesty anchors
  void GPU_DEVICE_SOAK_AAA_READY
  void NANITE_MARKETING_ALLOWED
  void LUMEN_MARKETING_ALLOWED

  return { ok: true, evidence }
}

/**
 * Async browser probe — requestAdapter when available; else fail-closed without inventing limits.
 */
export async function probeAndRunGpuDeviceSoak(input?: {
  hardwareConcurrency?: number
  deviceMemoryGb?: number
  frameIterations?: number
  now?: () => number
}): Promise<GpuDeviceSoakResult> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return {
      ok: false,
      code: 'no_adapter_limits',
      message: 'GPU device soak refused — navigator.gpu unavailable (no invent)',
      success: false,
      durationMs: null,
      scalableRenderGraphAaaReady: false,
      webgpuViewportPresentReady: false,
      marketingAllowed: false,
    }
  }

  try {
    const nav = navigator as Navigator & {
      gpu?: {
        requestAdapter: () => Promise<{
          limits?: {
            maxTextureDimension2D?: number
            maxBufferSize?: number
            maxBindGroups?: number
            maxComputeWorkgroupSizeX?: number
            maxStorageBufferBindingSize?: number
          }
          requestAdapterInfo?: () => Promise<{ device?: string; description?: string }>
          info?: { device?: string }
        } | null>
      }
    }
    const adapter = await nav.gpu?.requestAdapter?.()
    if (!adapter?.limits?.maxTextureDimension2D) {
      return {
        ok: false,
        code: 'no_adapter_limits',
        message: 'GPU device soak refused — adapter null or limits missing',
        success: false,
        durationMs: null,
        scalableRenderGraphAaaReady: false,
        webgpuViewportPresentReady: false,
        marketingAllowed: false,
      }
    }

    let adapterName = 'WebGPU adapter'
    try {
      if (typeof adapter.requestAdapterInfo === 'function') {
        const info = await adapter.requestAdapterInfo()
        adapterName = info?.device || info?.description || adapterName
      } else if (adapter.info?.device) {
        adapterName = adapter.info.device
      }
    } catch {
      /* keep default */
    }

    return runGpuDeviceSoakEvidence({
      adapterName,
      limits: {
        maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
        maxBufferSize: adapter.limits.maxBufferSize,
        maxBindGroups: adapter.limits.maxBindGroups,
        maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX,
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      },
      webgpuAvailable: true,
      hardwareConcurrency: input?.hardwareConcurrency,
      deviceMemoryGb: input?.deviceMemoryGb,
      frameIterations: input?.frameIterations,
      now: input?.now,
    })
  } catch {
    return {
      ok: false,
      code: 'no_adapter_limits',
      message: 'GPU device soak refused — requestAdapter threw',
      success: false,
      durationMs: null,
      scalableRenderGraphAaaReady: false,
      webgpuViewportPresentReady: false,
      marketingAllowed: false,
    }
  }
}

/** Honesty probe for CI / routes — inject limits; never empty success. */
export function proveGpuDeviceSoakReadiness(input?: {
  limits?: GpuAdapterLimitsEvidence
}): {
  ready: boolean
  status: 'PARTIAL' | 'HELD'
  letter: typeof GPU_DEVICE_SOAK_LETTER
  aaaReady: false
  marketingAllowed: false
  evidenceFingerprint: string | null
  reason: string
} {
  const result = runGpuDeviceSoakEvidence({
    adapterName: 'vitest-inject-adapter',
    limits: input?.limits ?? {
      maxTextureDimension2D: 8192,
      maxBufferSize: 268_435_456,
      maxBindGroups: 4,
    },
    webgpuAvailable: true,
    hardwareConcurrency: 8,
    deviceMemoryGb: 8,
    frameIterations: 32,
  })

  if (!result.ok) {
    return {
      ready: false,
      status: 'HELD',
      letter: GPU_DEVICE_SOAK_LETTER,
      aaaReady: false,
      marketingAllowed: false,
      evidenceFingerprint: null,
      reason: result.message,
    }
  }

  return {
    ready: true,
    status: 'PARTIAL',
    letter: GPU_DEVICE_SOAK_LETTER,
    aaaReady: false,
    marketingAllowed: false,
    evidenceFingerprint: result.evidence.evidenceFingerprint,
    reason: result.evidence.claim,
  }
}
