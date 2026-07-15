import type {
  RuntimeExecutionRoute,
  RuntimeExecutionSafety,
  RuntimeExecutionTarget,
} from '@/lib/device/runtime-execution-router'
import type { RuntimeLanePlacement } from '@/lib/device/runtime-lane-scheduler'
import type { ViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

export const VIEWPORT_RENDER_QUEUE_JOB_TYPE = 'render:viewport'

export type ViewportRenderQueueStatus = 'not-requested' | 'queued' | 'held' | 'unavailable'

export type ViewportRenderRuntimeRoute = Pick<
  RuntimeExecutionRoute,
  | 'lane'
  | 'canStart'
  | 'target'
  | 'preferredPlacement'
  | 'safety'
  | 'requiresConfirmation'
  | 'reason'
  | 'label'
  | 'detail'
>

export interface ViewportRenderQueuePayload {
  projectId: string
  projectName?: string
  metadata: {
    source: 'viewport-render-contract'
    renderContract: ViewportRenderJobContract
    runtimeRoute: ViewportRenderRuntimeRoute
    evidenceRequired: string[]
    expectedOutputs: string[]
    estimatedCostUsd: number
    executionPlan: {
      lane: 'viewport-render'
      isolation: 'outside-browser-main-thread'
      quality: ViewportRenderJobContract['quality']
      mode: ViewportRenderJobContract['mode']
      renderMode: ViewportRenderJobContract['renderMode']
      target: RuntimeExecutionTarget
    }
  }
  runtimeRoute: ViewportRenderRuntimeRoute
  runtimeTarget: RuntimeExecutionTarget
  requestedBy: string
  requestedAt: string
}

export interface ViewportRenderQueueResult {
  status: ViewportRenderQueueStatus
  queued: boolean
  jobId?: string
  runtimeRoute: ViewportRenderRuntimeRoute
  message: string
}

const RUNTIME_TARGETS = new Set<RuntimeExecutionTarget>([
  'local-main-safe',
  'local-worker',
  'local-native',
  'cloud-sandbox',
  'held',
])

const RUNTIME_PLACEMENTS = new Set<RuntimeLanePlacement>([
  'local-main-safe',
  'local-worker',
  'local-native',
  'cloud-sandbox',
])

const RUNTIME_SAFETIES = new Set<RuntimeExecutionSafety>([
  'ready',
  'needs-confirmation',
  'held',
  'fallback',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRuntimeTarget(value: unknown): value is RuntimeExecutionTarget {
  return typeof value === 'string' && RUNTIME_TARGETS.has(value as RuntimeExecutionTarget)
}

function isRuntimePlacement(value: unknown): value is RuntimeLanePlacement {
  return typeof value === 'string' && RUNTIME_PLACEMENTS.has(value as RuntimeLanePlacement)
}

function isRuntimeSafety(value: unknown): value is RuntimeExecutionSafety {
  return typeof value === 'string' && RUNTIME_SAFETIES.has(value as RuntimeExecutionSafety)
}

function formatRuntimeValue(value: string): string {
  return value.replace(/-/g, ' ')
}

export function buildDefaultViewportRenderRuntimeRoute(
  contract: ViewportRenderJobContract
): ViewportRenderRuntimeRoute {
  const target = contract.profile.target
  const requiresConfirmation = contract.profile.requiresHumanApproval

  return {
    lane: 'viewport-render',
    canStart: true,
    target,
    preferredPlacement: target,
    safety: requiresConfirmation ? 'needs-confirmation' : 'ready',
    requiresConfirmation,
    reason: `${contract.profile.label} is eligible for ${formatRuntimeValue(target)} execution.`,
    label: `viewport render -> ${formatRuntimeValue(target)}`,
    detail:
      'Viewport rendering is routed through an isolated worker, native executor, or cloud sandbox so the IDE stays responsive.',
  }
}

export function coerceViewportRenderRuntimeRoute(
  value: unknown,
  contract: ViewportRenderJobContract
): ViewportRenderRuntimeRoute {
  const fallback = buildDefaultViewportRenderRuntimeRoute(contract)
  if (!isRecord(value)) return fallback

  const target = isRuntimeTarget(value.target) ? value.target : fallback.target
  const preferredPlacement = isRuntimePlacement(value.preferredPlacement)
    ? value.preferredPlacement
    : target === 'held'
      ? fallback.preferredPlacement
      : target
  const safety = isRuntimeSafety(value.safety)
    ? value.safety
    : target === 'held'
      ? 'held'
      : fallback.safety
  const reason = typeof value.reason === 'string' && value.reason.trim().length > 0
    ? value.reason
    : fallback.reason
  const label = typeof value.label === 'string' && value.label.trim().length > 0
    ? value.label
    : `viewport render -> ${formatRuntimeValue(target)}`
  const detail = typeof value.detail === 'string' && value.detail.trim().length > 0
    ? value.detail
    : fallback.detail

  return {
    lane: 'viewport-render',
    canStart: target !== 'held' && value.canStart !== false,
    target,
    preferredPlacement,
    safety,
    requiresConfirmation:
      typeof value.requiresConfirmation === 'boolean'
        ? value.requiresConfirmation
        : safety === 'needs-confirmation',
    reason,
    label,
    detail,
  }
}

export function shouldHoldViewportRenderRuntimeRoute(route: ViewportRenderRuntimeRoute): boolean {
  return !route.canStart || route.target === 'held' || route.safety === 'held'
}

export function buildViewportRenderQueuePayload(input: {
  contract: ViewportRenderJobContract
  projectId: string
  projectName?: string
  runtimeRoute: ViewportRenderRuntimeRoute
  requestedBy: string
  requestedAt?: string
}): ViewportRenderQueuePayload {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    metadata: {
      source: 'viewport-render-contract',
      renderContract: {
        ...input.contract,
        projectId: input.projectId,
      },
      runtimeRoute: input.runtimeRoute,
      evidenceRequired: input.contract.acceptance,
      expectedOutputs: input.contract.profile.expectedOutputs,
      estimatedCostUsd: input.contract.estimatedCostUsd,
      executionPlan: {
        lane: 'viewport-render',
        isolation: 'outside-browser-main-thread',
        quality: input.contract.quality,
        mode: input.contract.mode,
        renderMode: input.contract.renderMode,
        target: input.runtimeRoute.target,
      },
    },
    runtimeRoute: input.runtimeRoute,
    runtimeTarget: input.runtimeRoute.target,
    requestedBy: input.requestedBy,
    requestedAt: input.requestedAt ?? new Date().toISOString(),
  }
}
