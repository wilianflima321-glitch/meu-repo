/**
 * Letter ca — Native 3D Generation Travas shared contracts.
 * ONNX+3DGS path (not Meshy hostage). Zero-MVP · Law XV · Law XVI FusionTx.
 */

export const NATIVE_GEN_LETTER = 'ca' as const
export const NATIVE_GEN_PIPELINE_ID = 'native-3d-generation-travas:v1' as const

/** Law XV — local ONNX Text-to-3D needs discrete-class VRAM; GT730 never claims 8GB. */
export const NATIVE_ONNX_MIN_CAPABILITY_SCORE = 45
/** Below this: fail-closed luxury path; CPU/small or Zero-UI MoA clay only. */
export const NATIVE_ONNX_GT730_FAIL_CLOSED_SCORE = 20
/** Soft VRAM budget claim for discrete (honesty — never applied to GT730). */
export const NATIVE_ONNX_DISCRETE_VRAM_MB_CLAIM = 4096
/** GT730 / integrated honest VRAM claim ceiling. */
export const NATIVE_ONNX_WEAK_VRAM_MB_CEILING = 512

/** V-HACD / heavy decomp stays offline below this score. */
export const VHACD_MIN_CAPABILITY_SCORE = 45
/** Default hull budget — gameplay proxy, not trimesh soup. */
export const VHACD_DEFAULT_MAX_HULLS = 16
/** Hard fail-closed single convex when decomposition too heavy. */
export const VHACD_FAILCLOSED_SINGLE_HULL = 1

export type NativeGenStageId =
  | 'vram-pager'
  | 'onnx-text-to-3d'
  | 'splat-to-mesh'
  | 'semantic-retopo'
  | 'delighting-pbr'
  | 'lod-cascade'
  | 'vhacd'
  | 'heat-diffusion-skin'
  | 'fusion-viewport'

export type NativeGenStageStatus = 'closed' | 'held' | 'skipped' | 'rejected' | 'zero-ui'

export interface NativeGenStageReceipt {
  stage: NativeGenStageId
  status: NativeGenStageStatus
  evidence: string[]
  heldReason?: string
  metrics?: Record<string, number | string | boolean>
}

export interface GaussianSplatCloud {
  /** xyz per splat. */
  positions: Float32Array
  /** Optional opacity 0–1 per splat (default 1). */
  opacities?: Float32Array
  /** Optional scales (sx,sy,sz) — unused by density grid smoke. */
  scales?: Float32Array
  splatCount: number
}

export interface NativeGenCapabilityGate {
  capabilityScore: number
  dedicatedVramMb: number | null
  /** Honest claim — never inflate GT730 to 8GB. */
  claimedVramMb: number
  onnxPathAllowed: boolean
  vhacdInlineAllowed: boolean
  /** True when score < GT730 fail-closed — Zero-UI MoA clay remains. */
  zeroUiFallback: boolean
  notes: string[]
}

export function evaluateNativeGenCapability(input: {
  capabilityScore: number
  dedicatedVramMb?: number | null
}): NativeGenCapabilityGate {
  const score = Math.max(0, Math.min(100, Math.round(input.capabilityScore)))
  const vram = input.dedicatedVramMb ?? null
  const zeroUiFallback = score < NATIVE_ONNX_GT730_FAIL_CLOSED_SCORE
  const onnxPathAllowed = score >= NATIVE_ONNX_MIN_CAPABILITY_SCORE && !zeroUiFallback

  let claimedVramMb: number
  if (zeroUiFallback || score < NATIVE_ONNX_MIN_CAPABILITY_SCORE) {
    claimedVramMb = Math.min(
      vram ?? NATIVE_ONNX_WEAK_VRAM_MB_CEILING,
      NATIVE_ONNX_WEAK_VRAM_MB_CEILING,
    )
  } else if (vram != null && vram > 0) {
    claimedVramMb = Math.min(vram, NATIVE_ONNX_DISCRETE_VRAM_MB_CLAIM * 2)
  } else {
    claimedVramMb = NATIVE_ONNX_DISCRETE_VRAM_MB_CLAIM
  }

  // Never claim 8GB on GT730-class
  if (score < NATIVE_ONNX_MIN_CAPABILITY_SCORE) {
    claimedVramMb = Math.min(claimedVramMb, NATIVE_ONNX_WEAK_VRAM_MB_CEILING)
  }

  return {
    capabilityScore: score,
    dedicatedVramMb: vram,
    claimedVramMb,
    onnxPathAllowed,
    vhacdInlineAllowed: score >= VHACD_MIN_CAPABILITY_SCORE,
    zeroUiFallback,
    notes: [
      zeroUiFallback
        ? 'Law XV GT730-class — native ONNX fail-closed; BYOK MoA clay Zero-UI'
        : onnxPathAllowed
          ? 'Discrete-class — ONNX path may run under VRAM pager'
          : 'Capability below ONNX min — defer native gen / CPU-small HELD',
      `claimedVramMb=${claimedVramMb} (never invent 8192 on weak GPU)`,
    ],
  }
}

/** Synthetic point cloud (sphere shell) for splat→mesh Vitest smoke. */
export function buildSyntheticSplatCloud(count = 256): GaussianSplatCloud {
  const positions = new Float32Array(count * 3)
  const opacities = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // Deterministic spherical shell (no Math.random)
    const t = (i + 0.5) / count
    const phi = Math.acos(1 - 2 * t)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    const r = 0.85 + 0.1 * Math.sin(i * 0.37)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi)
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    opacities[i] = 0.7 + 0.3 * ((i % 7) / 6)
  }
  return { positions, opacities, splatCount: count }
}
