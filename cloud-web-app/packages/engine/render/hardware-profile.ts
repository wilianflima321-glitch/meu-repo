/**
 * Law XV — Hardware static profile + Capability Score (0–100).
 * Spec: AETHEL_HARDWARE_SCALABILITY_SPEC.md §3.1
 * Block 3B.1 CORE — real scoring; desktop frame graph remains HELD.
 */

export type RenderTier = 'enthusiast' | 'discrete' | 'integrated' | 'webgl2'

export type HardwareApi =
  | 'wgpu-vulkan'
  | 'wgpu-dx12'
  | 'webgpu'
  | 'webgl2'

export interface HardwareStaticProfile {
  tier: RenderTier
  capabilityScore: number
  api: HardwareApi
  adapterName: string
  isIntegrated: boolean
  isUMA: boolean
  dedicatedVramMb: number | null
  supportsBindless: boolean
  supportsRayTracing: boolean
  supportsCompute: boolean
  cpuCoreCount: number
  cpuTier: 'high' | 'mid' | 'low'
  confidence: 'high' | 'medium' | 'low'
  /** Honest: web probes never claim native wgpu frame graph */
  desktopFrameGraphLive: false
}

export interface HardwareDynamicProfile {
  gpuFrameMsP95: number
  cpuFrameMsP95: number
  vramPressureScore: number
  bottleneck: 'gpu' | 'cpu' | 'memory' | 'balanced'
  recommendedInternalScale: number
}

export interface UMABudgetPolicy {
  maxResidentTextureMb: number
  maxResidentMeshMb: number
  maxConcurrentChunks: number
  evictionAggression: 'aggressive' | 'normal'
}

export type CullingBackend = 'gpu_compute' | 'cpu_workers' | 'hybrid'

export interface CullingPolicy {
  backend: CullingBackend
  cpuWorkerCount: number
  gpuCullingMaxObjects: number
}

export interface WebHardwareProbeInput {
  webgpuAvailable?: boolean
  webgl2Available?: boolean
  /** navigator.gpu adapter name when known */
  adapterName?: string
  /** Adapter maxBufferSize / maxTextureDimension2D hints when probed */
  maxTextureDimension2D?: number
  hardwareConcurrency?: number
  deviceMemoryGb?: number
  /** Force low confidence path */
  forceWebgl2?: boolean
}

/** Blueprint label from continuous Capability Score bands (Law XV §1). */
export function tierFromCapabilityScore(score: number): RenderTier {
  const s = clampScore(score)
  if (s >= 75) return 'enthusiast'
  if (s >= 45) return 'discrete'
  if (s >= 20) return 'integrated'
  return 'webgl2'
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function cpuTierFromCores(cores: number): 'high' | 'mid' | 'low' {
  if (cores >= 12) return 'high'
  if (cores >= 6) return 'mid'
  return 'low'
}

/**
 * Compute Capability Score 0–100 from browser/static probes.
 * Never invents VRAM or RT cores — web confidence is medium/low.
 */
export function computeWebCapabilityScore(input: WebHardwareProbeInput): {
  score: number
  confidence: HardwareStaticProfile['confidence']
} {
  const cores = input.hardwareConcurrency ?? 4
  const mem = input.deviceMemoryGb ?? 4
  const webgpu = input.webgpuAvailable === true && !input.forceWebgl2
  const webgl2 = input.webgl2Available !== false

  if (!webgpu && !webgl2) {
    return { score: 0, confidence: 'low' }
  }

  let score = 8
  if (webgpu) {
    score += 28
  } else {
    score += 10 // WebGL2 official fallback
  }

  // CPU weight (Law XV: strong CPU helps integrated path)
  score += Math.min(22, Math.floor(cores * 2.2))
  // Device memory (UMA-ish proxy on web)
  score += Math.min(18, Math.floor(mem * 2.5))

  if (typeof input.maxTextureDimension2D === 'number') {
    if (input.maxTextureDimension2D >= 16384) score += 12
    else if (input.maxTextureDimension2D >= 8192) score += 8
    else if (input.maxTextureDimension2D >= 4096) score += 4
  }

  const confidence: HardwareStaticProfile['confidence'] = webgpu
    ? input.maxTextureDimension2D
      ? 'medium'
      : 'medium'
    : 'low'

  // Web ceiling: never claim enthusiast native path from browser alone
  const capped = Math.min(score, webgpu ? 62 : 38)
  return { score: clampScore(capped), confidence }
}

export function buildHardwareStaticProfile(
  input: WebHardwareProbeInput = {}
): HardwareStaticProfile {
  const cores = input.hardwareConcurrency ?? 4
  const mem = input.deviceMemoryGb ?? 4
  const webgpu = input.webgpuAvailable === true && !input.forceWebgl2
  const { score, confidence } = computeWebCapabilityScore(input)
  const tier = tierFromCapabilityScore(score)

  return {
    tier,
    capabilityScore: score,
    api: webgpu ? 'webgpu' : 'webgl2',
    adapterName: input.adapterName || (webgpu ? 'WebGPU adapter' : 'WebGL2'),
    isIntegrated: true,
    isUMA: true,
    dedicatedVramMb: null,
    supportsBindless: false,
    supportsRayTracing: false,
    supportsCompute: webgpu,
    cpuCoreCount: cores,
    cpuTier: cpuTierFromCores(cores),
    confidence,
    desktopFrameGraphLive: false,
  }
}

/**
 * Browser probe — sync heuristics + optional GPU presence.
 * Async adapter limits can be passed in via input after await navigator.gpu.requestAdapter().
 */
export function probeWebHardwareProfile(
  input: WebHardwareProbeInput = {}
): HardwareStaticProfile {
  const defaults: WebHardwareProbeInput = {
    webgpuAvailable:
      input.webgpuAvailable ??
      (typeof navigator !== 'undefined' && 'gpu' in navigator),
    webgl2Available: input.webgl2Available,
    hardwareConcurrency:
      input.hardwareConcurrency ??
      (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4),
    deviceMemoryGb:
      input.deviceMemoryGb ??
      (typeof navigator !== 'undefined'
        ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
        : 4),
    adapterName: input.adapterName,
    maxTextureDimension2D: input.maxTextureDimension2D,
    forceWebgl2: input.forceWebgl2,
  }

  if (defaults.webgl2Available === undefined && typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas')
      defaults.webgl2Available = Boolean(canvas.getContext('webgl2'))
    } catch {
      defaults.webgl2Available = false
    }
  }

  return buildHardwareStaticProfile(defaults)
}

/** Async enrich with WebGPU adapter name + texture limit when available. */
export async function probeWebHardwareProfileAsync(
  input: WebHardwareProbeInput = {}
): Promise<HardwareStaticProfile> {
  const base: WebHardwareProbeInput = { ...input }
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const nav = navigator as Navigator & {
        gpu?: {
          requestAdapter: () => Promise<{
            limits?: { maxTextureDimension2D?: number }
            requestAdapterInfo?: () => Promise<{ device?: string; description?: string }>
            info?: { device?: string }
          } | null>
        }
      }
      const adapter = await nav.gpu?.requestAdapter?.()
      if (adapter) {
        base.webgpuAvailable = true
        let adapterName = 'WebGPU adapter'
        try {
          if (typeof (adapter as any).requestAdapterInfo === 'function') {
            const info = await (adapter as any).requestAdapterInfo()
            adapterName = info?.device || info?.description || adapterName
          } else if ((adapter as any).info?.device) {
            adapterName = adapter.info.device
          }
        } catch {
          /* ignore info probe */
        }
        base.adapterName = adapterName
        base.maxTextureDimension2D = adapter.limits?.maxTextureDimension2D
      } else {
        base.webgpuAvailable = false
      }
    } catch {
      base.webgpuAvailable = false
    }
  }
  return probeWebHardwareProfile(base)
}

export function deriveUMABudget(profile: HardwareStaticProfile): UMABudgetPolicy {
  const memProxy = profile.dedicatedVramMb ?? profile.cpuCoreCount * 512
  const cap = Math.max(128, Math.floor(memProxy * 0.28))
  return {
    maxResidentTextureMb: Math.floor(cap * 0.6),
    maxResidentMeshMb: Math.floor(cap * 0.3),
    maxConcurrentChunks: profile.tier === 'webgl2' ? 2 : profile.tier === 'integrated' ? 4 : 8,
    evictionAggression: profile.tier === 'webgl2' || profile.tier === 'integrated' ? 'aggressive' : 'normal',
  }
}

export function resolveCullingPolicy(
  staticProfile: HardwareStaticProfile,
  dynamic?: Partial<HardwareDynamicProfile>
): CullingPolicy {
  const bottleneck = dynamic?.bottleneck
  const preferCpu =
    staticProfile.tier === 'webgl2' ||
    staticProfile.tier === 'integrated' ||
    bottleneck === 'gpu' ||
    !staticProfile.supportsCompute

  return {
    backend: preferCpu ? 'cpu_workers' : staticProfile.supportsCompute ? 'hybrid' : 'cpu_workers',
    cpuWorkerCount: Math.max(1, Math.min(4, Math.floor(staticProfile.cpuCoreCount / 2))),
    gpuCullingMaxObjects: preferCpu ? 0 : 50_000,
  }
}

/**
 * Map Capability Score → Auto Fidelity resolved level (Block 3A wire).
 */
export function fidelityLevelFromCapabilityScore(
  score: number
): 'performance' | 'balanced' | 'quality' | 'ultra' {
  const s = clampScore(score)
  if (s < 25) return 'performance'
  if (s < 45) return 'balanced'
  if (s < 62) return 'quality'
  return 'ultra'
}

/** Map desktop adapter sample → score (honest, no fake VRAM). Used by Tauri bridge later. */
export function scoreFromDesktopAdapterSample(input: {
  adapterName?: string | null
  backend?: string | null
  cpuCoreCount?: number
  memoryTotalMb?: number
}): { score: number; confidence: HardwareStaticProfile['confidence']; tier: RenderTier } {
  const name = (input.adapterName || '').toLowerCase()
  const cores = input.cpuCoreCount ?? 8
  const memGb = (input.memoryTotalMb ?? 8192) / 1024
  let score = 20
  score += Math.min(20, Math.floor(cores * 1.5))
  score += Math.min(15, Math.floor(memGb * 1.2))

  if (/rtx\s*(40|30|20)/i.test(name) || /radeon\s*rx\s*(7|6)/i.test(name)) score += 45
  else if (/rtx|radeon\s*rx|geforce/i.test(name)) score += 30
  else if (/intel\s*(arc|xe)|radeon\s*graphics|uhd|iris/i.test(name)) score += 12
  else if (name) score += 8

  // Still no frame graph — cap marketing below enthusiast ship claim
  const capped = Math.min(score, 88)
  const finalScore = clampScore(capped)
  return {
    score: finalScore,
    confidence: name ? 'medium' : 'low',
    tier: tierFromCapabilityScore(finalScore),
  }
}

/**
 * Apply an explicit Capability Score onto a profile — always re-derives tier.
 * Prevents stale tier + overridden score (Law XV fail-closed consumers).
 */
export function withCapabilityScore(
  profile: HardwareStaticProfile,
  capabilityScore: number
): HardwareStaticProfile {
  const score = clampScore(capabilityScore)
  return {
    ...profile,
    capabilityScore: score,
    tier: tierFromCapabilityScore(score),
  }
}
