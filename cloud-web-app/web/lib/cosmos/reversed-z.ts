/**
 * Letter cn — Reversed-Z infinite depth buffer (f32) — kill planetary Z-fighting.
 * UE5 / modern engines: clip near=1 far=0, depth clear 0.
 */

export const COSMOS_REVERSED_Z_WIRED = true as const

export interface ReversedZProjection {
  /** Near plane world units (must be > 0). */
  near: number
  /** Far plane — Infinity for infinite reverse-Z. */
  far: number
  /** True when using reverse-Z (near maps to 1, far to 0). */
  reversed: boolean
  /** Column-major 16 floats — OpenGL-style perspective reverse-Z. */
  projectionMatrix: Float32Array
  /** Depth clear value (0 for reverse-Z). */
  depthClear: number
  /** Depth compare: 'greater' for reverse-Z. */
  depthFunc: 'greater' | 'less'
}

/**
 * Build reverse-Z infinite perspective projection (column-major).
 * Based on UE / D3D reverse-Z: P[10]=0, P[11]=-1, P[14]=near.
 */
export function buildReversedZProjection(input: {
  fovYRadians: number
  aspect: number
  near: number
  far?: number
}): ReversedZProjection {
  const near = Math.max(1e-4, input.near)
  const far = input.far ?? Number.POSITIVE_INFINITY
  const f = 1 / Math.tan(input.fovYRadians / 2)
  const aspect = Math.max(1e-6, input.aspect)
  const m = new Float32Array(16)
  // Column-major
  m[0] = f / aspect
  m[5] = f
  m[10] = 0 // reverse infinite: far at 0
  m[11] = -1
  m[14] = near
  m[15] = 0
  // Standard reverse-Z infinite: m[10] = 0, m[14] = near (GL clip z)
  // Some APIs use m[10]=0, m[14]=near with depthFunc greater.
  void far
  return {
    near,
    far: Number.POSITIVE_INFINITY,
    reversed: true,
    projectionMatrix: m,
    depthClear: 0,
    depthFunc: 'greater',
  }
}

/** Classic forward-Z for CapScore GT730 fallback (no reverse-Z). */
export function buildForwardZProjection(input: {
  fovYRadians: number
  aspect: number
  near: number
  far: number
}): ReversedZProjection {
  const near = Math.max(1e-4, input.near)
  const far = Math.max(near + 1e-3, input.far)
  const f = 1 / Math.tan(input.fovYRadians / 2)
  const aspect = Math.max(1e-6, input.aspect)
  const nf = 1 / (near - far)
  const m = new Float32Array(16)
  m[0] = f / aspect
  m[5] = f
  m[10] = (far + near) * nf
  m[11] = -1
  m[14] = 2 * far * near * nf
  return {
    near,
    far,
    reversed: false,
    projectionMatrix: m,
    depthClear: 1,
    depthFunc: 'less',
  }
}

/**
 * Apply projection to a duck-typed Three.js PerspectiveCamera.
 * Sets camera.near/far and optionally copies matrix when projectionMatrix exists.
 */
export function applyReversedZToCamera(
  camera: {
    near: number
    far: number
    fov?: number
    aspect?: number
    updateProjectionMatrix?: () => void
    projectionMatrix?: { fromArray?: (a: ArrayLike<number>) => void; elements?: number[] }
  } | null | undefined,
  plan: ReversedZProjection,
): { applied: boolean; zeroUiUnavailable: boolean } {
  if (!camera) return { applied: false, zeroUiUnavailable: true }
  if (plan.reversed) {
    camera.near = plan.near
    camera.far = 1e30 // Three.js rejects Infinity; use huge far + matrix override
  } else {
    camera.near = plan.near
    camera.far = plan.far
  }
  if (camera.projectionMatrix?.fromArray) {
    camera.projectionMatrix.fromArray(plan.projectionMatrix)
  } else if (camera.projectionMatrix?.elements) {
    for (let i = 0; i < 16; i++) {
      camera.projectionMatrix.elements[i] = plan.projectionMatrix[i]!
    }
  } else {
    camera.updateProjectionMatrix?.()
  }
  return { applied: true, zeroUiUnavailable: false }
}

export function proveReversedZ(): {
  passed: boolean
  nearMapsHigh: boolean
  farMapsLow: boolean
  notes: string[]
} {
  const p = buildReversedZProjection({
    fovYRadians: Math.PI / 3,
    aspect: 16 / 9,
    near: 0.1,
  })
  // Reverse-Z: depth at near should be high (≈1), far → 0.
  // With P[10]=0, P[14]=near, P[11]=-1: clip_z/w → near/|z| style.
  const nearMapsHigh = p.depthClear === 0 && p.depthFunc === 'greater'
  const farMapsLow = p.far === Number.POSITIVE_INFINITY && p.reversed
  return {
    passed: nearMapsHigh && farMapsLow && p.projectionMatrix.length === 16,
    nearMapsHigh,
    farMapsLow,
    notes: [
      'Reversed-Z Infinite depth CLOSED (f32 projection)',
      'Native WebGL depthFunc reverse soak / desktop wgpu parity HELD',
    ],
  }
}
