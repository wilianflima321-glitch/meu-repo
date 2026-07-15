import { buildMediaPipeBridgeCapability, type MediaPipeBridgeCapability } from '@/lib/ai-ondevice/face-mesh/mediapipe-bridge'
import { buildLumaPhotogrammetryProviderCapability, type LumaPhotogrammetryProviderCapability } from '@/lib/integrations/photogrammetry/luma-ai'
import { buildRapierPhysicsDriverCapability, type RapierPhysicsDriverCapability } from '@/lib/physics/rapier-driver'
import type { V29OperationalState } from '@aethel/runtime/v29-internal-spine'

export interface PhysicsAiOnDevicePhotogrammetryMatrixInput {
  rapierAvailable: boolean
  mediaPipeEnabled: boolean
  mediaPipeRunsOnDevice: boolean
  lumaConfigured: boolean
  teardownConfigured: boolean
  evidenceRefs: string[]
  estimatedPhotogrammetryCostUsd: number
  costCapUsd: number
  humanApproved?: boolean
}

export interface PhysicsAiOnDevicePhotogrammetryMatrix {
  version: 1
  state: V29OperationalState
  physics: RapierPhysicsDriverCapability
  onDeviceCapture: MediaPipeBridgeCapability
  photogrammetry: LumaPhotogrammetryProviderCapability
  blockers: string[]
  missingReceipts: string[]
  prohibitedClaims: string[]
  nextAction: string
}

function aggregateState(states: V29OperationalState[]): V29OperationalState {
  if (states.includes('blocked')) return 'blocked'
  if (states.includes('provider_unavailable')) return 'provider_unavailable'
  if (states.includes('held')) return 'held'
  if (states.includes('human_review_required')) return 'human_review_required'
  return 'needs-review'
}

export function buildPhysicsAiOnDevicePhotogrammetryMatrix(
  input: PhysicsAiOnDevicePhotogrammetryMatrixInput,
): PhysicsAiOnDevicePhotogrammetryMatrix {
  const physics = buildRapierPhysicsDriverCapability({
    rapierAvailable: input.rapierAvailable,
    runtimeTarget: 'studio-local',
    evidenceRefs: input.evidenceRefs,
    humanApproved: input.humanApproved,
  })
  const onDeviceCapture = buildMediaPipeBridgeCapability({
    task: 'face-mesh',
    enabled: input.mediaPipeEnabled,
    runsOnDevice: input.mediaPipeRunsOnDevice,
    evidenceRefs: input.evidenceRefs,
    humanApproved: input.humanApproved,
  })
  const photogrammetry = buildLumaPhotogrammetryProviderCapability({
    apiConfigured: input.lumaConfigured,
    outputKind: 'retopo-source',
    evidenceRefs: input.evidenceRefs,
    estimatedCostUsd: input.estimatedPhotogrammetryCostUsd,
    costCapUsd: input.costCapUsd,
    teardownConfigured: input.teardownConfigured,
    humanApproved: input.humanApproved,
  })
  const state = aggregateState([physics.state, onDeviceCapture.state, photogrammetry.state])
  const blockers = [...physics.blockers, ...onDeviceCapture.blockers, ...photogrammetry.blockers]
  const missingReceipts = Array.from(
    new Set([...physics.missingEvidence, ...onDeviceCapture.missingReceipts, ...photogrammetry.missingReceipts]),
  )

  return {
    version: 1,
    state,
    physics,
    onDeviceCapture,
    photogrammetry,
    blockers,
    missingReceipts,
    prohibitedClaims: ['Unreal-grade', 'final asset', 'production ready', 'research verified'],
    nextAction:
      blockers.length > 0
        ? 'Resolve provider, privacy, teardown, and cost blockers before enabling advanced runtime lanes.'
        : missingReceipts.length > 0
          ? 'Attach runtime, capture, provenance, privacy, replay, cost, and human review receipts.'
          : 'Advanced runtime lanes can enter human review; no final or production claims are allowed automatically.',
  }
}
