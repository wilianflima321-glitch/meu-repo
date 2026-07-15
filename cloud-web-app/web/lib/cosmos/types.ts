/**
 * Letter cn — Aethel Cosmos contracts (planetary / space scale).
 * Zero-MVP: interfaces + soak toward supremacy; MMO space / Star-Citizen-solved claims HELD.
 */

export const COSMOS_LETTER = 'cn' as const
export const COSMOS_WIRED = true as const

/** Absolute world position — CPU f64 (LWC). GPU never sees these raw. */
export interface LwcVec3 {
  x: number
  y: number
  z: number
}

/** Camera-relative f32 pose for GPU / Three.js. */
export interface CameraRelativePose {
  x: number
  y: number
  z: number
}

export type CosmosPhysicsSpace = 'exterior-absolute' | 'interior-island'

export interface CosmosCapabilityBudget {
  capabilityScore: number
  tier: 'gt730' | 'integrated' | 'discrete' | 'enthusiast'
  /** Max nested interior islands simultaneous. */
  maxNestedGrids: number
  /** Fine BVH radius meters (player cluster). */
  fineBvhRadiusM: number
  /** Coarse solar BVH leaf AU scale (1 AU ≈ 1.496e11 m — we use abstract units). */
  coarseBvhLeafAu: number
  /** Interest radius meters for net relevance. */
  interestRadiusM: number
  /** Max actors of interest per client tick. */
  maxInterestActors: number
  /** Enable reversed-Z infinite projection. */
  reversedZAllowed: boolean
  /** Enable floating-origin rebases. */
  floatingOriginAllowed: boolean
  /** CCD bodies budget (hypervelocity). */
  ccdBodiesMax: number
  /** Acoustic ray steps (vacuum vs atmosphere). */
  acousticRaySteps: number
  /** Sky atmosphere sample count. */
  skyAtmosphereSamples: number
  /** 3D volumetric partition cell size meters. */
  volumetricCellSizeM: number
  notes: string[]
}

export interface CosmosGearStatus {
  id: string
  closed: boolean
  heldReason?: string
}
