/**
 * Letter cg — Ocean CapScore budgets + viewport opt-in.
 */

export const OCEAN_CAPABILITY_BUDGET_WIRED = true as const
export const OCEAN_VIEWPORT_OPTIN_WIRED = true as const

export type OceanTier = 'webgl2' | 'integrated' | 'discrete' | 'enthusiast'

export interface OceanCapabilityBudget {
  capabilityScore: number
  tier: OceanTier
  fftResolution: number
  buoyancyBodiesMax: number
  viewportOptInAllowed: boolean
  notes: string[]
}

export function resolveOceanCapabilityBudget(capabilityScore: number): OceanCapabilityBudget {
  const score = Number.isFinite(capabilityScore)
    ? Math.max(0, Math.min(100, Math.round(capabilityScore)))
    : 0
  const tier: OceanTier =
    score >= 75 ? 'enthusiast' : score >= 45 ? 'discrete' : score >= 20 ? 'integrated' : 'webgl2'

  if (tier === 'webgl2') {
    return {
      capabilityScore: score,
      tier,
      fftResolution: 16,
      buoyancyBodiesMax: 8,
      viewportOptInAllowed: true,
      notes: ['GT730/webgl2: FFT 16² + few buoyancy bodies'],
    }
  }
  if (tier === 'integrated') {
    return {
      capabilityScore: score,
      tier,
      fftResolution: 32,
      buoyancyBodiesMax: 24,
      viewportOptInAllowed: true,
      notes: ['integrated: FFT 32²'],
    }
  }
  if (tier === 'discrete') {
    return {
      capabilityScore: score,
      tier,
      fftResolution: 64,
      buoyancyBodiesMax: 64,
      viewportOptInAllowed: true,
      notes: ['discrete: FFT 64²'],
    }
  }
  return {
    capabilityScore: score,
    tier,
    fftResolution: 128,
    buoyancyBodiesMax: 128,
    viewportOptInAllowed: true,
    notes: ['enthusiast budget; Unreal Water parity still HELD'],
  }
}

export interface OceanViewportOptIn {
  enabled: boolean
  fftResolution: number
  applyBuoyancy: boolean
  capabilityScore: number
}

/**
 * Viewport opt-in — WaterEditor / playtest must call enable explicitly.
 * Default disabled (Zero-UI when CapScore too low still allowed but cheap).
 */
export function planOceanViewportOptIn(input: {
  capabilityScore: number
  userEnabled: boolean
  applyBuoyancy?: boolean
}): OceanViewportOptIn {
  const budget = resolveOceanCapabilityBudget(input.capabilityScore)
  const enabled = input.userEnabled === true && budget.viewportOptInAllowed
  return {
    enabled,
    fftResolution: budget.fftResolution,
    applyBuoyancy: enabled && input.applyBuoyancy !== false,
    capabilityScore: budget.capabilityScore,
  }
}
