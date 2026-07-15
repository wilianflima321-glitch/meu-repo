import type { V29OperationalState } from '@aethel/runtime/v29-internal-spine'

export type OnDeviceAiTask = 'face-mesh' | 'pose-capture' | 'segmentation' | 'voice-analysis'

export interface MediaPipeBridgeInput {
  task: OnDeviceAiTask
  enabled: boolean
  runsOnDevice: boolean
  evidenceRefs: string[]
  humanApproved?: boolean
}

export interface MediaPipeBridgeCapability {
  id: 'mediapipe-ondevice-bridge:v1'
  task: OnDeviceAiTask
  state: V29OperationalState
  runsOnDevice: boolean
  privacyMode: 'local-only-required'
  requiredReceipts: string[]
  missingReceipts: string[]
  blockers: string[]
  prohibitedClaims: string[]
  nextAction: string
  humanReviewRequired: true
}

export const MEDIAPIPE_BRIDGE_REQUIRED_RECEIPTS = [
  'user consent receipt',
  'device capability probe',
  'privacy retention policy receipt',
  'model/version receipt',
  'capture replay receipt',
  'human review receipt',
] as const

export function buildMediaPipeBridgeCapability(input: MediaPipeBridgeInput): MediaPipeBridgeCapability {
  const evidence = new Set(input.evidenceRefs)
  const missingReceipts = MEDIAPIPE_BRIDGE_REQUIRED_RECEIPTS.filter((receipt) =>
    receipt === 'human review receipt' ? input.humanApproved !== true && !evidence.has(receipt) : !evidence.has(receipt),
  )
  const blockers = [
    ...(input.enabled ? [] : ['On-device AI bridge is not enabled.']),
    ...(input.runsOnDevice ? [] : ['Capture data must stay local-only until explicit privacy approval exists.']),
  ]
  const state: V29OperationalState =
    blockers.length > 0
      ? input.enabled
        ? 'blocked'
        : 'provider_unavailable'
      : missingReceipts.length > 0
        ? 'held'
        : 'needs-review'

  return {
    id: 'mediapipe-ondevice-bridge:v1',
    task: input.task,
    state,
    runsOnDevice: input.runsOnDevice,
    privacyMode: 'local-only-required',
    requiredReceipts: [...MEDIAPIPE_BRIDGE_REQUIRED_RECEIPTS],
    missingReceipts,
    blockers,
    prohibitedClaims: ['research verified', 'production ready', 'autonomous capture ready'],
    nextAction:
      state === 'provider_unavailable'
        ? 'Install or enable the on-device model bridge before capture.'
        : blockers.length > 0
          ? 'Keep capture blocked until local-only privacy mode and consent receipts exist.'
          : missingReceipts.length > 0
            ? 'Attach consent, device probe, privacy, model, replay, and human review receipts.'
            : 'On-device capture can enter human review; do not upload or publish without approval.',
    humanReviewRequired: true,
  }
}
