import type { DeviceCapabilityProfile } from './device-capability-profile'
import type { LocalRuntimeBridgeState } from './local-runtime-bridge'
import type {
  RuntimeLaneDecision,
  RuntimeLanePlacement,
  RuntimeWorkLane,
} from './runtime-lane-scheduler'

export type RuntimeExecutionTarget = RuntimeLanePlacement | 'held'

export type RuntimeExecutionSafety = 'ready' | 'needs-confirmation' | 'held' | 'fallback'

export interface RuntimeExecutionRoute {
  lane: RuntimeWorkLane
  canStart: boolean
  target: RuntimeExecutionTarget
  preferredPlacement: RuntimeLanePlacement
  safety: RuntimeExecutionSafety
  requiresConfirmation: boolean
  reason: string
  label: string
  detail: string
  nativeBridge: LocalRuntimeBridgeState['connection']
}

function describePlacement(placement: RuntimeExecutionTarget): string {
  return placement === 'held' ? 'held' : placement.replace(/-/g, ' ')
}

function buildReadyRoute(input: {
  decision: RuntimeLaneDecision
  target: RuntimeLanePlacement
  safety?: RuntimeExecutionSafety
  reason?: string
  detail?: string
  bridgeConnection: LocalRuntimeBridgeState['connection']
}): RuntimeExecutionRoute {
  const safety = input.safety ?? (input.decision.requiresConfirmation ? 'needs-confirmation' : 'ready')
  const label = `${input.decision.lane.replace(/-/g, ' ')} -> ${describePlacement(input.target)}`

  return {
    lane: input.decision.lane,
    canStart: true,
    target: input.target,
    preferredPlacement: input.decision.placement,
    safety,
    requiresConfirmation: input.decision.requiresConfirmation,
    reason: input.reason ?? input.decision.reason,
    label,
    detail:
      input.detail ??
      `${input.decision.lane.replace(/-/g, ' ')} will run through ${describePlacement(input.target)}.`,
    nativeBridge: input.bridgeConnection,
  }
}

const HEAVY_RUNTIME_LANES = new Set(['browser-operator', 'viewport-render', 'build-export', 'memory-indexing'])

export function resolveRuntimeExecutionRoute(input: {
  profile: DeviceCapabilityProfile
  decision: RuntimeLaneDecision
  localBridge?: LocalRuntimeBridgeState | null
}): RuntimeExecutionRoute {
  const { profile, decision } = input
  const localBridge = input.localBridge ?? null
  const bridgeConnection = localBridge?.connection ?? 'missing'

  if (!decision.canStart) {
    return {
      lane: decision.lane,
      canStart: false,
      target: 'held',
      preferredPlacement: decision.placement,
      safety: 'held',
      requiresConfirmation: decision.requiresConfirmation,
      reason: decision.reason,
      label: `${decision.lane.replace(/-/g, ' ')} held`,
      detail: decision.reason,
      nativeBridge: bridgeConnection,
    }
  }

  if (decision.placement === 'local-main-safe' && HEAVY_RUNTIME_LANES.has(decision.lane)) {
    return buildReadyRoute({
      decision,
      target: 'cloud-sandbox',
      safety: 'fallback',
      bridgeConnection,
      reason: `${decision.lane.replace(/-/g, ' ')} cannot run on the browser main thread; Aethel will use isolated execution instead.`,
      detail:
        'Runtime Engine Spine policy keeps render, build, memory indexing, and browser automation outside the UI thread.',
    })
  }

  if (decision.placement === 'cloud-sandbox' || decision.placement === 'local-main-safe') {
    return buildReadyRoute({
      decision,
      target: decision.placement,
      bridgeConnection,
    })
  }

  if (decision.placement === 'local-native') {
    const nativeReport = localBridge?.report ?? null
    const nativeHealthy =
      bridgeConnection === 'connected' &&
      nativeReport?.thermalState !== 'critical' &&
      (nativeReport?.preferredExecutor === 'local-native' ||
        nativeReport?.npuAvailable === true ||
        nativeReport?.gpuComputeAvailable === true)

    if (nativeHealthy) {
      return buildReadyRoute({
        decision,
        target: 'local-native',
        bridgeConnection,
        detail:
          'This work can use the Studio Local native executor while the web shell stays responsive.',
      })
    }

    return buildReadyRoute({
      decision,
      target: 'cloud-sandbox',
      safety: 'fallback',
      bridgeConnection,
      reason:
        bridgeConnection === 'stale'
          ? 'The native probe is stale, so Aethel will fall back to cloud isolation for this work.'
          : 'The native executor is not available, so Aethel will fall back to cloud isolation for this work.',
      detail:
        'The scheduler preferred native execution, but the current device snapshot is not safe enough for local-native routing.',
    })
  }

  if (decision.placement === 'local-worker') {
    if (profile.policy.mode === 'safe-mode' || profile.policy.backgroundTaskBudget === 'limited') {
      return buildReadyRoute({
        decision,
        target: 'cloud-sandbox',
        safety: 'fallback',
        bridgeConnection,
        reason:
          'This device is in a constrained policy, so Aethel will isolate worker-heavy work away from the UI.',
      })
    }

    return buildReadyRoute({
      decision,
      target: 'local-worker',
      bridgeConnection,
    })
  }

  return buildReadyRoute({
    decision,
    target: 'cloud-sandbox',
    safety: 'fallback',
    bridgeConnection,
    reason: 'Aethel could not resolve a native placement, so this work will use cloud isolation.',
  })
}
