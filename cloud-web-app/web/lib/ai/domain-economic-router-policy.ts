/**
 * Letter cx — FinOps domain economic router (Universal IDE Forge).
 * UI/panels → Sonnet-class lane; kernel/physics → Grok/Opus/reasoning lane.
 * CostGuard Trava I always; settle:0 on lane / policy reject.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  selectApexForDomain,
  type ApexModelCandidate,
  type ApexTaskDomain,
} from '@/lib/ai/fusion-specialist-registry'
import {
  selectModelForTask,
  type RoutingDecision,
  type TaskKind,
} from '@/lib/ai/intelligent-model-router'
import {
  settleCreativeCostZero,
  type CostGuardLedgerAdapter,
} from '@/lib/production/creative-cost-guard'

const log = createComponentLogger('domain-economic-router-policy')

export const DOMAIN_ECONOMIC_ROUTER_LETTER = 'cx' as const
export const DOMAIN_ECONOMIC_ROUTER_WIRED = true as const

/** Economic lane — Founder thesis binding */
export type EconomicLane = 'ui-sonnet' | 'kernel-reasoning'

export type ForgeWorkDomain =
  | 'ui'
  | 'panels'
  | 'agentic-ui'
  | 'design-tokens'
  | 'kernel'
  | 'physics'
  | 'netcode'
  | 'render-graph'
  | 'deep-refactor'
  | 'planning'
  | 'critic'
  | 'code'
  | 'tests'
  | 'assets'
  | 'lighting'
  | 'mesh'
  | 'audio'
  | 'creative-writing'

export type DomainLaneRejectReason =
  | 'unknown_domain'
  | 'premium_empty_no_elite_open_weights'
  | 'cost_guard_denied'
  | 'lane_policy_forbidden'
  | 'model_unavailable'

export interface DomainEconomicRouteRequest {
  domain: ForgeWorkDomain
  /** Prefer open-weights when Premium pool empty */
  premiumAvailable?: boolean
  preferOpenWeights?: boolean
  /** Optional CostGuard reservation — settle:0 on reject */
  reservationId?: string
  costGuardAdapter?: CostGuardLedgerAdapter
  /** Restrict catalog for tests */
  availableModelIds?: string[]
}

export interface DomainEconomicRouteOk {
  ok: true
  lane: EconomicLane
  domain: ForgeWorkDomain
  apexDomain: ApexTaskDomain
  taskKind: TaskKind
  modelId: string
  candidate: ApexModelCandidate | null
  routing: RoutingDecision | null
  settleZeroOnReject: true
  rationale: string
}

export interface DomainEconomicRouteReject {
  ok: false
  lane: EconomicLane | null
  domain: ForgeWorkDomain
  reason: DomainLaneRejectReason
  message: string
  settleZero: true
  settledZero: boolean
}

export type DomainEconomicRouteResult = DomainEconomicRouteOk | DomainEconomicRouteReject

const UI_DOMAINS: ReadonlySet<ForgeWorkDomain> = new Set([
  'ui',
  'panels',
  'agentic-ui',
  'design-tokens',
])

const KERNEL_DOMAINS: ReadonlySet<ForgeWorkDomain> = new Set([
  'kernel',
  'physics',
  'netcode',
  'render-graph',
  'deep-refactor',
])

/** Sonnet-class model ids (UI lane preferred) */
const SONNET_CLASS_IDS = [
  'anthropic/claude-sonnet-4',
  'openai/gpt-4o',
  'deepseek/deepseek-chat-v3',
] as const

/** Kernel / deep reasoning preferred ids (Grok / Opus / reasoning) */
const KERNEL_CLASS_IDS = [
  'anthropic/claude-opus-4',
  'x-ai/grok-3',
  'qwen/qwen-2.5-72b-instruct',
] as const

export function resolveEconomicLane(domain: ForgeWorkDomain): EconomicLane {
  if (UI_DOMAINS.has(domain)) return 'ui-sonnet'
  if (KERNEL_DOMAINS.has(domain)) return 'kernel-reasoning'
  // planning / critic / code default to Sonnet lane (cost-aware); escalate via explicit kernel domain
  return 'ui-sonnet'
}

export function mapForgeDomainToApex(domain: ForgeWorkDomain): ApexTaskDomain {
  switch (domain) {
    case 'ui':
    case 'panels':
    case 'agentic-ui':
    case 'design-tokens':
      return 'ui'
    case 'kernel':
    case 'physics':
    case 'netcode':
    case 'render-graph':
    case 'deep-refactor':
    case 'code':
      return 'code'
    case 'planning':
      return 'planning'
    case 'critic':
      return 'critic'
    case 'tests':
      return 'tests'
    case 'assets':
      return 'assets'
    case 'lighting':
      return 'lighting'
    case 'mesh':
      return 'mesh'
    case 'audio':
      return 'audio'
    case 'creative-writing':
      return 'creative-writing'
    default:
      return 'code'
  }
}

export function mapForgeDomainToTaskKind(domain: ForgeWorkDomain): TaskKind {
  switch (domain) {
    case 'ui':
    case 'panels':
    case 'agentic-ui':
    case 'design-tokens':
      return 'code'
    case 'kernel':
    case 'physics':
    case 'netcode':
    case 'render-graph':
    case 'deep-refactor':
      return 'deep-reasoning'
    case 'planning':
      return 'planning'
    case 'critic':
      return 'critic'
    case 'tests':
      return 'code'
    case 'mesh':
      return 'mesh-generation'
    case 'lighting':
    case 'assets':
      return 'material-authoring'
    case 'audio':
      return 'creative-writing'
    case 'creative-writing':
      return 'creative-writing'
    default:
      return 'code'
  }
}

function preferredIdsForLane(lane: EconomicLane): readonly string[] {
  return lane === 'ui-sonnet' ? SONNET_CLASS_IDS : KERNEL_CLASS_IDS
}

async function settleZeroIfNeeded(
  request: DomainEconomicRouteRequest,
): Promise<boolean> {
  if (!request.reservationId || !request.costGuardAdapter) return false
  await settleCreativeCostZero(request.reservationId, request.costGuardAdapter)
  return true
}

/**
 * Route a Forge work domain to the economic model lane.
 * Rejects with settle:0 when CostGuard reservation is present and lane cannot be filled.
 */
export async function routeDomainEconomically(
  request: DomainEconomicRouteRequest,
): Promise<DomainEconomicRouteResult> {
  const lane = resolveEconomicLane(request.domain)
  const apexDomain = mapForgeDomainToApex(request.domain)
  const taskKind = mapForgeDomainToTaskKind(request.domain)
  const preferred = preferredIdsForLane(lane)

  const apex = selectApexForDomain({
    domain: apexDomain,
    premiumAvailable: request.premiumAvailable,
    preferOpenWeights: request.preferOpenWeights ?? request.premiumAvailable === false,
  })

  // Prefer lane-aligned candidate when Apex pick is off-lane
  let modelId = apex?.modelId
  if (modelId && !preferred.includes(modelId as (typeof preferred)[number])) {
    const laneHit = preferred.find((id) => {
      if (request.availableModelIds && !request.availableModelIds.includes(id)) return false
      return true
    })
    if (laneHit) modelId = laneHit
  }

  if (!modelId) {
    const settledZero = await settleZeroIfNeeded(request)
    log.warn('domain_economic_route_reject', {
      domain: request.domain,
      reason: 'premium_empty_no_elite_open_weights',
      settleZero: true,
    })
    return {
      ok: false,
      lane,
      domain: request.domain,
      reason: 'premium_empty_no_elite_open_weights',
      message: 'No Apex candidate for domain — refuse Nano/dumb fallback (Decision #55)',
      settleZero: true,
      settledZero,
    }
  }

  // Kernel lane must not silently downgrade to UI-only Sonnet when Opus/Grok available
  if (lane === 'kernel-reasoning') {
    const isKernelClass = KERNEL_CLASS_IDS.includes(modelId as (typeof KERNEL_CLASS_IDS)[number])
    const isSonnetOnly = SONNET_CLASS_IDS.includes(modelId as (typeof SONNET_CLASS_IDS)[number])
    if (isSonnetOnly && !isKernelClass) {
      const grokOrOpus = KERNEL_CLASS_IDS.find((id) => {
        if (request.availableModelIds && !request.availableModelIds.includes(id)) return false
        return true
      })
      if (grokOrOpus) {
        modelId = grokOrOpus
      }
    }
  }

  // UI lane must not burn Opus for panel polish
  if (lane === 'ui-sonnet' && modelId === 'anthropic/claude-opus-4') {
    modelId = 'anthropic/claude-sonnet-4'
  }

  const routing = selectModelForTask({
    kind: taskKind,
    complexity: lane === 'kernel-reasoning' ? 'high' : 'medium',
    budget: lane === 'kernel-reasoning' ? 'max-quality' : 'balanced',
    needsTools: true,
    needsJson: true,
    availableModelIds: request.availableModelIds ?? [...preferred, modelId],
  })

  const rationale =
    lane === 'ui-sonnet'
      ? `UI/panels lane → Sonnet-class (${modelId}); CostGuard Trava I; no Opus burn on chrome`
      : `Kernel/physics lane → Grok/Opus/reasoning (${modelId}); CostGuard Trava I; weekly evolution only — no 24/7 poll`

  log.info('domain_economic_route_ok', {
    domain: request.domain,
    lane,
    modelId,
    letter: DOMAIN_ECONOMIC_ROUTER_LETTER,
  })

  return {
    ok: true,
    lane,
    domain: request.domain,
    apexDomain,
    taskKind,
    modelId,
    candidate: apex,
    routing,
    settleZeroOnReject: true,
    rationale,
  }
}

/**
 * Explicit reject helper for gates (LazyInspector / L.5 / Founder reject) — always settle:0.
 */
export async function rejectDomainRouteWithSettleZero(input: {
  domain: ForgeWorkDomain
  reason: DomainLaneRejectReason
  message: string
  reservationId?: string
  costGuardAdapter?: CostGuardLedgerAdapter
}): Promise<DomainEconomicRouteReject> {
  const lane = resolveEconomicLane(input.domain)
  let settledZero = false
  if (input.reservationId && input.costGuardAdapter) {
    await settleCreativeCostZero(input.reservationId, input.costGuardAdapter)
    settledZero = true
  }
  return {
    ok: false,
    lane,
    domain: input.domain,
    reason: input.reason,
    message: input.message,
    settleZero: true,
    settledZero,
  }
}
