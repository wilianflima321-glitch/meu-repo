import type { V29OperationalState } from '@aethel/runtime/v29-internal-spine'

export type PhysicsRuntimeTarget = 'browser-preview' | 'studio-local' | 'cloud-simulation'

export interface RapierPhysicsDriverInput {
  rapierAvailable: boolean
  runtimeTarget: PhysicsRuntimeTarget
  evidenceRefs: string[]
  humanApproved?: boolean
}

export interface RapierPhysicsDriverCapability {
  id: 'rapier-physics-driver:v1'
  engine: 'rapier'
  state: V29OperationalState
  canSimulate: boolean
  heavyRuntimeBoundary: 'studio-or-viewport-only'
  requiredEvidence: string[]
  missingEvidence: string[]
  blockers: string[]
  prohibitedClaims: string[]
  nextAction: string
  humanReviewRequired: true
}

export const RAPIER_DRIVER_REQUIRED_EVIDENCE = [
  'manual consent receipt',
  'navmesh bake report',
  'physics replay',
  'performance trace',
  'human gameplay review',
] as const

export function buildRapierPhysicsDriverCapability(input: RapierPhysicsDriverInput): RapierPhysicsDriverCapability {
  const evidence = new Set(input.evidenceRefs)
  const missingEvidence = RAPIER_DRIVER_REQUIRED_EVIDENCE.filter((item) =>
    item === 'human gameplay review' ? input.humanApproved !== true && !evidence.has(item) : !evidence.has(item),
  )
  const blockers = [
    ...(input.rapierAvailable ? [] : ['Rapier runtime is not available for this lane.']),
    ...(input.runtimeTarget === 'browser-preview'
      ? ['Browser physics is preview-only; gameplay authority must be Studio Local or cloud simulation for release claims.']
      : []),
  ]
  const state: V29OperationalState =
    blockers.length > 0
      ? input.rapierAvailable
        ? 'held'
        : 'provider_unavailable'
      : missingEvidence.length > 0
        ? 'held'
        : 'needs-review'

  return {
    id: 'rapier-physics-driver:v1',
    engine: 'rapier',
    state,
    canSimulate: input.rapierAvailable && missingEvidence.length === 0,
    heavyRuntimeBoundary: 'studio-or-viewport-only',
    requiredEvidence: [...RAPIER_DRIVER_REQUIRED_EVIDENCE],
    missingEvidence,
    blockers,
    prohibitedClaims: ['production ready', 'Unreal-grade', 'final gameplay physics'],
    nextAction:
      state === 'provider_unavailable'
        ? 'Install and probe Rapier before exposing this runtime lane.'
        : missingEvidence.length > 0 || blockers.length > 0
          ? 'Attach navmesh, replay, performance, consent, and human gameplay review receipts before release claims.'
          : 'Physics can enter human release review; keep release claims held until approval.',
    humanReviewRequired: true,
  }
}
