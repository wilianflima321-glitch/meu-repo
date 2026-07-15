import type { DeviceRuntimePolicy } from './device-capability-profile'

export type RuntimeWorkLane =
  | 'ai-agents'
  | 'browser-operator'
  | 'viewport-render'
  | 'build-export'
  | 'memory-indexing'
  | 'file-sync'

export type RuntimeLanePlacement = 'local-main-safe' | 'local-worker' | 'local-native' | 'cloud-sandbox'

export interface RuntimeLaneBudget {
  lane: RuntimeWorkLane
  label: string
  maxConcurrent: number
  placement: RuntimeLanePlacement
  pauseWhenUserActive: boolean
  requiresConfirmation: boolean
  maxQueueDepth: number
}

export interface RuntimePressureSignals {
  userActive: boolean
  activeByLane: Partial<Record<RuntimeWorkLane, number>>
  queuedByLane?: Partial<Record<RuntimeWorkLane, number>>
}

export interface RuntimeLaneDecision {
  lane: RuntimeWorkLane
  canStart: boolean
  placement: RuntimeLanePlacement
  reason: string
  requiresConfirmation: boolean
}

const LANE_LABELS: Record<RuntimeWorkLane, string> = {
  'ai-agents': 'AI agents',
  'browser-operator': 'Browser operator',
  'viewport-render': 'Viewport/render',
  'build-export': 'Build/export',
  'memory-indexing': 'Memory indexing',
  'file-sync': 'File sync',
}

function budget(
  lane: RuntimeWorkLane,
  maxConcurrent: number,
  placement: RuntimeLanePlacement,
  options: Partial<Pick<RuntimeLaneBudget, 'pauseWhenUserActive' | 'requiresConfirmation' | 'maxQueueDepth'>> = {}
): RuntimeLaneBudget {
  return {
    lane,
    label: LANE_LABELS[lane],
    maxConcurrent,
    placement,
    pauseWhenUserActive: options.pauseWhenUserActive ?? false,
    requiresConfirmation: options.requiresConfirmation ?? false,
    maxQueueDepth: options.maxQueueDepth ?? Math.max(2, maxConcurrent * 3),
  }
}

export function buildRuntimeLaneBudgets(policy: DeviceRuntimePolicy): RuntimeLaneBudget[] {
  switch (policy.mode) {
    case 'local-accelerated':
      return [
        budget('ai-agents', policy.maxParallelAgents, 'local-native', { maxQueueDepth: 12 }),
        budget('browser-operator', 2, 'cloud-sandbox', { requiresConfirmation: false, maxQueueDepth: 6 }),
        budget('viewport-render', 2, 'local-worker', { maxQueueDepth: 4 }),
        budget('build-export', 1, 'cloud-sandbox', { pauseWhenUserActive: false, maxQueueDepth: 3 }),
        budget('memory-indexing', 2, 'local-worker', { pauseWhenUserActive: true, maxQueueDepth: 8 }),
        budget('file-sync', 2, 'local-worker', { maxQueueDepth: 8 }),
      ]
    case 'hybrid-balanced':
      return [
        budget('ai-agents', policy.maxParallelAgents, 'local-worker', { maxQueueDepth: 6 }),
        budget('browser-operator', 1, 'cloud-sandbox', { requiresConfirmation: false, maxQueueDepth: 4 }),
        budget('viewport-render', 1, 'local-worker', { maxQueueDepth: 3 }),
        budget('build-export', 1, 'cloud-sandbox', { maxQueueDepth: 2 }),
        budget('memory-indexing', 1, 'local-worker', { pauseWhenUserActive: true, maxQueueDepth: 4 }),
        budget('file-sync', 1, 'local-worker', { maxQueueDepth: 5 }),
      ]
    case 'cloud-isolated':
      return [
        budget('ai-agents', 1, 'cloud-sandbox', { maxQueueDepth: 4 }),
        budget('browser-operator', 1, 'cloud-sandbox', { requiresConfirmation: true, maxQueueDepth: 2 }),
        budget('viewport-render', 1, 'cloud-sandbox', { maxQueueDepth: 2 }),
        budget('build-export', 1, 'cloud-sandbox', { maxQueueDepth: 2 }),
        budget('memory-indexing', 1, 'cloud-sandbox', { pauseWhenUserActive: true, maxQueueDepth: 2 }),
        budget('file-sync', 1, 'local-worker', { maxQueueDepth: 3 }),
      ]
    case 'safe-mode':
    default:
      return [
        budget('ai-agents', 1, 'cloud-sandbox', { maxQueueDepth: 2 }),
        budget('browser-operator', 1, 'cloud-sandbox', { requiresConfirmation: true, maxQueueDepth: 1 }),
        budget('viewport-render', 1, 'cloud-sandbox', { pauseWhenUserActive: false, maxQueueDepth: 1 }),
        budget('build-export', 1, 'cloud-sandbox', { maxQueueDepth: 1 }),
        budget('memory-indexing', 0, 'cloud-sandbox', { pauseWhenUserActive: true, maxQueueDepth: 1 }),
        budget('file-sync', 1, 'local-worker', { maxQueueDepth: 2 }),
      ]
  }
}

export function decideRuntimeLaneStart(
  policy: DeviceRuntimePolicy,
  lane: RuntimeWorkLane,
  pressure: RuntimePressureSignals
): RuntimeLaneDecision {
  const laneBudget = buildRuntimeLaneBudgets(policy).find((item) => item.lane === lane)

  if (!laneBudget) {
    return {
      lane,
      canStart: false,
      placement: 'cloud-sandbox',
      reason: 'Unknown runtime lane.',
      requiresConfirmation: true,
    }
  }

  const active = pressure.activeByLane[lane] ?? 0
  const queued = pressure.queuedByLane?.[lane] ?? 0

  if (laneBudget.maxConcurrent <= 0) {
    return {
      lane,
      canStart: false,
      placement: laneBudget.placement,
      reason: `${laneBudget.label} is disabled on this device profile to keep the UI responsive.`,
      requiresConfirmation: laneBudget.requiresConfirmation,
    }
  }

  if (laneBudget.pauseWhenUserActive && pressure.userActive) {
    return {
      lane,
      canStart: false,
      placement: laneBudget.placement,
      reason: `${laneBudget.label} pauses while the user is actively interacting with Studio.`,
      requiresConfirmation: laneBudget.requiresConfirmation,
    }
  }

  if (active >= laneBudget.maxConcurrent) {
    return {
      lane,
      canStart: false,
      placement: laneBudget.placement,
      reason: `${laneBudget.label} is at its concurrency limit.`,
      requiresConfirmation: laneBudget.requiresConfirmation,
    }
  }

  if (queued >= laneBudget.maxQueueDepth) {
    return {
      lane,
      canStart: false,
      placement: laneBudget.placement,
      reason: `${laneBudget.label} queue is full; use cloud isolation or wait for current work to finish.`,
      requiresConfirmation: laneBudget.requiresConfirmation,
    }
  }

  return {
    lane,
    canStart: true,
    placement: laneBudget.placement,
    reason: `${laneBudget.label} can start in ${laneBudget.placement.replace(/-/g, ' ')}.`,
    requiresConfirmation: laneBudget.requiresConfirmation,
  }
}
