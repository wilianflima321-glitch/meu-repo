/**
 * Maestro creative orchestration pulse (Law XVI custody — not J.12 OrchestratorProd).
 *
 * Intent → CostGuard preflight → Nexus squad/specialist → FusionTransaction scopes.
 * Fail-closed when J.12 STOPPED path is requested, credits missing, or Mini-IA
 * attempts a non-allowlisted tool (no host PTY, no live broker, no OrchestratorProd).
 *
 * Pattern sibling: `lib/server/quant/maestro-finance-pulse.ts` (finance veto).
 * Mini-IA = narrow UX helper surface only — Maestro owns orchestration authority.
 */

import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  cancelCreativeCost,
  getCreativeCostReservation,
  reserveCreativeCost,
  type CostGuardBlockReason,
  type CostGuardLedgerAdapter,
} from '@/lib/production/creative-cost-guard'
import {
  dispatchCreativeArtifact,
  type CreativeArtifactDomain,
  type CreativeArtifactRequest,
  type CreativeArtifactResult,
  type CreativeProviderDispatch,
} from '@/lib/production/creative-artifact-bridge'
import type { FusionYDocScope } from '@/lib/production/creative-fusion-transaction'
import {
  dispatchNexusSquad,
  type NexusCreativeOperatorHint,
  type NexusSquadResult,
} from '@/lib/production/nexus-squad-dispatch'
import { evaluateAgentShellPolicy } from '@/lib/production/agent-shell-policy'
import {
  bindCreativeQualityTier,
  type CreativeFidelityBand,
  type CreativeQualityTierBinding,
} from '@/lib/production/creative-quality-tier-binding'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'
import {
  evaluateWorldForgeMaestroSuccessBarrier,
  type WorldForgeArtifactEvidence,
  type WorldForgeMaestroSuccessVerdict,
} from '@/lib/world-forge/world-forge-maestro-barrier'

const log = createComponentLogger('maestro-creative-pulse')

/** Founder Pacto — J.11/J.12 remain STOPPED; never flip without Founder lift. */
export const ORCHESTRATOR_PROD_STOPPED = true as const
export const J12_ORCHESTRATOR_PROD_SHIPPED = false as const

/**
 * Narrow Mini-IA tool surface (backend contracts only).
 * Anything outside this set is fail-closed — including host PTY and live broker.
 */
export const MINI_IA_ALLOWED_TOOLS = [
  'creative.intent.classify',
  'creative.cost.preflight',
  'nexus.squad.hint',
  'fusion.scope.propose',
  'quality.tier.read',
  'scene.context.read',
  'vector.index.search',
] as const

export type MiniIaAllowedTool = (typeof MINI_IA_ALLOWED_TOOLS)[number]

export const MINI_IA_FORBIDDEN_TOOLS = [
  'host.pty',
  'desktop.native.pty',
  'cloud.container.pty',
  'live.broker.submit',
  'orchestrator.prod.dispatch',
  'acp.task.dispatch',
  'agent.shell.host',
] as const

export type MiniIaForbiddenTool = (typeof MINI_IA_FORBIDDEN_TOOLS)[number]

export type CreativeCreationKind = 'game' | 'film' | 'app' | 'asset'

export interface MaestroCreativePulseInput {
  projectId: string
  userId: string
  intent: string
  creationKind: CreativeCreationKind
  domain: CreativeArtifactDomain
  /** CapScore 0–100 — required for quality-tier binding (Law XV). */
  capabilityScore: number | null | undefined
  /** Prefer cloud cook when local CapScore cannot host the band. */
  preferCloudCook?: boolean
  costGuard: {
    byokProfileId?: string
    usageBucketId?: string
    estimatedTokenWeight: number
    planId?: string
    /** Conveyor-nucleus settle ceiling (multiple of estimate); CostGuard clamps to [1, MAX]. */
    settleCeilingMultiplier?: number
  }
  /** When true, caller tried to route via J.12 OrchestratorProd — always refuse. */
  requestOrchestratorProd?: boolean
  /** Mini-IA requested tool name (must be allowlisted). */
  miniIaTool?: string
  /** Mini-IA attempted host/shell or broker — fail-closed. */
  miniIaAttemptHostPty?: boolean
  miniIaAttemptLiveBroker?: boolean
  planId?: string
  riskScore?: number
  now?: string
  /**
   * Top-8 #5 — when present (game / world-layout), pulse refuses unless
   * World Forge Maestro success barrier passes (terrain + PCG evidence).
   */
  worldForgeEvidence?: Omit<WorldForgeArtifactEvidence, 'projectId'> & { projectId?: string }
}

export type CreativePulseRejectCode =
  | 'invalid_input'
  | 'orchestrator_prod_stopped'
  | 'credits_missing'
  | 'cost_guard_denied'
  | 'mini_ia_tool_forbidden'
  | 'mini_ia_host_pty_forbidden'
  | 'mini_ia_live_broker_forbidden'
  | 'quality_tier_refused'
  | 'world_forge_barrier_refused'
  | 'empty_intent'

export type CreativePulseResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      code: CreativePulseRejectCode
      message: string
      blockedReason?: CostGuardBlockReason | CreativePulseRejectCode
    }

export interface MaestroCreativePulseVerdict {
  allowed: boolean
  creationKind: CreativeCreationKind
  domain: CreativeArtifactDomain
  projectId: string
  userId: string
  fusionScopes: FusionYDocScope[]
  requiresFusionWrite: boolean
  squad: NexusSquadResult
  creativeOperator: NexusCreativeOperatorHint
  quality: CreativeQualityTierBinding
  fidelityBand: CreativeFidelityBand
  /** Mini-IA never gains orchestration or submit authority */
  miniIaMayOrchestrate: false
  miniIaMaySubmitBroker: false
  orchestratorProdShipped: false
  j12Stopped: true
  reservationPreflightOk: true
  /** Conveyor nucleus (Creative #1): the CostGuard reservation HELD by this verdict — reused by
   * `dispatchMaestroCreativePulse` so settle debits the SAME hold (no reserve→cancel→re-reserve). */
  reservationId: string
  reservationFunding: 'byok' | 'usage_bucket' | 'wallet'
  reservationSettleCeiling: number
  reservationEstimatedTokenWeight: number
  /** Present when worldForgeEvidence was supplied and barrier passed. */
  worldForgeBarrier?: WorldForgeMaestroSuccessVerdict
  reasons: string[]
  evidenceRefs: string[]
}

const WRITE_DOMAINS: ReadonlySet<CreativeArtifactDomain> = new Set([
  'world-layout',
  'vs-graph',
  'bt-graph',
  'cinematic-beat',
  'texture',
  'mesh',
  'code-patch',
  'video-to-scaffold',
])

function fusionScopesForDomain(domain: CreativeArtifactDomain): FusionYDocScope[] {
  switch (domain) {
    case 'vs-graph':
      return ['visual-script', 'manifest']
    case 'bt-graph':
    case 'video-to-scaffold':
      return ['behavior-tree', 'manifest']
    case 'cinematic-beat':
      return ['scene', 'manifest']
    case 'music':
    case 'voice':
      return ['sound-cue', 'manifest']
    case 'mesh':
    case 'texture':
    case 'world-layout':
    case 'image':
    case 'video':
      return ['scene', 'manifest']
    case 'code-patch':
      return ['manifest']
    case 'web-research':
      return []
    default:
      return ['manifest']
  }
}

export function isMiniIaToolAllowed(tool: string | undefined | null): tool is MiniIaAllowedTool {
  if (!tool || typeof tool !== 'string') return false
  return (MINI_IA_ALLOWED_TOOLS as readonly string[]).includes(tool)
}

export function isMiniIaToolForbidden(tool: string | undefined | null): tool is MiniIaForbiddenTool {
  if (!tool || typeof tool !== 'string') return false
  return (MINI_IA_FORBIDDEN_TOOLS as readonly string[]).includes(tool)
}

/**
 * Evaluate one Maestro creative pulse.
 * Does not call providers — only routes + CostGuard preflight + scope plan.
 * Caller must still `dispatchCreativeArtifact` through the Bridge for real generation.
 */
export async function evaluateMaestroCreativePulse(
  input: MaestroCreativePulseInput,
  adapter: CostGuardLedgerAdapter,
): Promise<CreativePulseResult<MaestroCreativePulseVerdict>> {
  if (!input.projectId?.trim() || !input.userId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'projectId and userId required' }
  }
  if (!input.intent?.trim()) {
    return { ok: false, code: 'empty_intent', message: 'Creative intent required' }
  }
  if (!input.domain || !input.creationKind) {
    return { ok: false, code: 'invalid_input', message: 'domain and creationKind required' }
  }
  if (
    typeof input.costGuard?.estimatedTokenWeight !== 'number' ||
    !Number.isFinite(input.costGuard.estimatedTokenWeight) ||
    input.costGuard.estimatedTokenWeight <= 0
  ) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'costGuard.estimatedTokenWeight must be a positive finite number',
    }
  }

  // J.12 Founder STOP — refuse any request that tries to resurrect OrchestratorProd
  if (input.requestOrchestratorProd === true) {
    log.warn('maestro_creative_pulse_j12_stopped', { projectId: input.projectId })
    return {
      ok: false,
      code: 'orchestrator_prod_stopped',
      message:
        'J.12 OrchestratorProd is Founder STOPPED — use Maestro + Nexus + CreativeBridge; do not dispatch OrchestratorProd',
      blockedReason: 'orchestrator_prod_stopped',
    }
  }

  if (input.miniIaAttemptHostPty === true) {
    const shell = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'host-pty',
      sandboxAvailable: false,
    })
    return {
      ok: false,
      code: 'mini_ia_host_pty_forbidden',
      message: shell.reason,
      blockedReason: 'mini_ia_host_pty_forbidden',
    }
  }

  if (input.miniIaAttemptLiveBroker === true) {
    return {
      ok: false,
      code: 'mini_ia_live_broker_forbidden',
      message: 'Mini-IA must not submit live broker orders — creative pulse has no finance authority',
      blockedReason: 'mini_ia_live_broker_forbidden',
    }
  }

  if (input.miniIaTool != null) {
    if (isMiniIaToolForbidden(input.miniIaTool) || !isMiniIaToolAllowed(input.miniIaTool)) {
      return {
        ok: false,
        code: 'mini_ia_tool_forbidden',
        message: `Mini-IA tool "${input.miniIaTool}" is outside the allowlisted surface — Maestro owns orchestration`,
        blockedReason: 'mini_ia_tool_forbidden',
      }
    }
  }

  const quality = bindCreativeQualityTier({
    capabilityScore: input.capabilityScore,
    preferCloudCook: input.preferCloudCook === true,
    domain: input.domain,
  })
  if (!quality.ok) {
    return {
      ok: false,
      code: 'quality_tier_refused',
      message: quality.reason,
      blockedReason: 'quality_tier_refused',
    }
  }

  let worldForgeBarrier: WorldForgeMaestroSuccessVerdict | undefined
  if (input.worldForgeEvidence) {
    const barrier = evaluateWorldForgeMaestroSuccessBarrier({
      ...input.worldForgeEvidence,
      projectId: input.worldForgeEvidence.projectId ?? input.projectId,
      claimedSuccess: true,
      now: input.now,
    })
    if (!barrier.ok) {
      return {
        ok: false,
        code: 'world_forge_barrier_refused',
        message: barrier.message,
        blockedReason: 'world_forge_barrier_refused',
      }
    }
    worldForgeBarrier = barrier.value
  }

  // Trava I — CostGuard preflight before any squad/provider path
  const reserved = await reserveCreativeCost(
    {
      userId: input.userId,
      projectId: input.projectId,
      domain: input.domain,
      estimatedTokenWeight: input.costGuard.estimatedTokenWeight,
      byokProfileId: input.costGuard.byokProfileId,
      usageBucketId: input.costGuard.usageBucketId,
      planId: input.costGuard.planId ?? input.planId,
      settleCeilingMultiplier: input.costGuard.settleCeilingMultiplier,
    },
    adapter,
  )
  if (!reserved.ok) {
    const code: CreativePulseRejectCode =
      reserved.reason === 'credits_exhausted' || reserved.reason === 'free_tier_platform_pay_forbidden'
        ? 'credits_missing'
        : 'cost_guard_denied'
    log.warn('maestro_creative_pulse_cost_guard', {
      projectId: input.projectId,
      reason: reserved.reason,
    })
    // Cancel is N/A — reserve failed; no reservationId
    return {
      ok: false,
      code,
      message: reserved.message,
      blockedReason: reserved.reason,
    }
  }

  // Conveyor nucleus (Creative #1): the reservation is HELD here and carried into dispatch.
  // No immediate cancel — `dispatchMaestroCreativePulse` reuses it through the CreativeBridge
  // choke so settle debits the same hold. Release via `releaseMaestroCreativePulseReservation`
  // if the caller aborts before dispatch.

  const squad = dispatchNexusSquad({
    missionId: `creative-pulse-${input.creationKind}`,
    maestroModelId: 'maestro-creative',
    planId: input.planId ?? input.costGuard.planId,
    userPrompt: input.intent,
    riskScore: input.riskScore ?? 55,
    allowedPaths: [`creative/${input.domain}`],
  })

  const fusionScopes = fusionScopesForDomain(input.domain)
  const requiresFusionWrite = WRITE_DOMAINS.has(input.domain)

  const verdict: MaestroCreativePulseVerdict = {
    allowed: true,
    creationKind: input.creationKind,
    domain: input.domain,
    projectId: input.projectId,
    userId: input.userId,
    fusionScopes,
    requiresFusionWrite,
    squad,
    creativeOperator: squad.creativeOperator,
    quality,
    fidelityBand: quality.fidelityBand,
    miniIaMayOrchestrate: false,
    miniIaMaySubmitBroker: false,
    orchestratorProdShipped: false,
    j12Stopped: true,
    reservationPreflightOk: reserved.ok,
    reservationId: reserved.reservation.reservationId,
    reservationFunding: reserved.reservation.funding,
    reservationSettleCeiling: reserved.reservation.settleCeilingMultiplier,
    reservationEstimatedTokenWeight: reserved.reservation.estimatedTokenWeight,
    worldForgeBarrier,
    reasons: [
      `Maestro creative pulse ALLOW — ${input.creationKind}/${input.domain}`,
      `CostGuard reservation HELD (conveyor nucleus — settle via CreativeBridge reuse)`,
      `Fidelity band ${quality.fidelityBand} (CapScore/hardware; no UE mesh claim)`,
      'J.12 OrchestratorProd STOPPED — Maestro+Nexus path only',
      'Mini-IA may not orchestrate or submit broker',
      ...(worldForgeBarrier
        ? [`World Forge barrier PASS fingerprint=${worldForgeBarrier.fingerprint}`]
        : []),
      ...(requiresFusionWrite
        ? [`FusionTx scopes required: ${fusionScopes.join(',')}`]
        : ['No Fusion write for this domain']),
    ],
    evidenceRefs: [
      'law-xvi:maestro-creative-pulse',
      'trava-i:cost-guard-held',
      `reservation:${reserved.reservation.reservationId.slice(0, 8)}`,
      'trava-ii:fusion-scopes',
      `quality:${quality.fidelityBand}`,
      'j12:stopped',
      'mini-ia:allowlist-only',
      ...(worldForgeBarrier ? ['wf-maestro-barrier:pass'] : []),
    ],
  }

  log.info('maestro_creative_pulse', {
    projectId: input.projectId,
    creationKind: input.creationKind,
    domain: input.domain,
    fidelityBand: quality.fidelityBand,
    operator: squad.creativeOperator.kind,
  })

  return { ok: true, value: verdict }
}

/**
 * Conveyor nucleus executor (Creative #1) — runs a held pulse reservation through the canonical
 * CreativeBridge choke (`dispatchCreativeArtifact`). The reservation held by
 * `evaluateMaestroCreativePulse` is REUSED (single reserve → settle), eliminating the
 * reserve→cancel→re-reserve TOCTOU, and the returned receipt is tied to the SAME reservation.
 *
 * NOT J.12 OrchestratorProd — this is the Maestro+Nexus dispatch leg under Law XVI custody.
 * Fails closed when the verdict carries no held reservation or the request drifts from it.
 */
export async function dispatchMaestroCreativePulse(input: {
  verdict: MaestroCreativePulseVerdict
  request: CreativeArtifactRequest
  adapter: CostGuardLedgerAdapter
  provider: CreativeProviderDispatch
  ledger?: TaskEvidenceLedger
}): Promise<{ result: CreativeArtifactResult; ledger: TaskEvidenceLedger }> {
  const { verdict, request, adapter, provider } = input

  // Conveyor contract: without a held reservation there is nothing to convey — never silently
  // reserve a fresh one here (that would re-open the double-reservation race for the caller).
  if (!verdict.reservationId) {
    const failedLedger =
      input.ledger ??
      createTaskEvidenceLedger({
        taskId: `creative-${verdict.domain}-conveyor-${randomUUID().slice(0, 8)}`,
        projectId: request.projectId,
        mission: `Creative ${verdict.domain}: conveyor dispatch`,
        ownerAgent: 'MaestroCreativePulse',
      })
    const refused = appendTaskEvidence(failedLedger, {
      kind: 'cost',
      title: 'Conveyor dispatch refused',
      summary: 'verdict carries no held reservation — dispatch through the Bridge after a pulse',
      refs: [],
      actor: 'MaestroCreativePulse',
    })
    return {
      result: {
        success: false,
        artifactId: '',
        provider: 'none',
        costUsd: 0,
        evidenceReceiptId: refused.events[refused.events.length - 1]?.id ?? '',
        blockedReason: 'cost_guard_denied',
      },
      ledger: refused,
    }
  }

  return dispatchCreativeArtifact({
    request: {
      ...request,
      existingReservationId: verdict.reservationId,
    },
    adapter,
    provider,
    ledger: input.ledger,
  })
}

/**
 * Release a held pulse reservation without dispatching (caller aborted the conveyor).
 * Refunds the full hold via CostGuard cancel. Idempotent — any later settle/cancel on the
 * released reservation is a no-op in CostGuard.
 */
export async function releaseMaestroCreativePulseReservation(
  verdict: Pick<MaestroCreativePulseVerdict, 'reservationId'>,
  adapter: CostGuardLedgerAdapter,
): Promise<void> {
  if (!verdict.reservationId) return
  await cancelCreativeCost(verdict.reservationId, adapter)
}

export function probeMaestroCreativePulseReadiness(): {
  id: 'maestro-creative-pulse'
  status: 'PARTIAL'
  ready: boolean
  path: string
  orchestratorProdShipped: false
  j12Stopped: true
  miniIaMayOrchestrate: false
  /** Conveyor nucleus (Creative #1): verdict holds the CostGuard reservation; dispatch reuses it. */
  conveyorNucleus: true
  note: string
} {
  const allowlistOk = MINI_IA_ALLOWED_TOOLS.length >= 5
  const forbiddenOk = MINI_IA_FORBIDDEN_TOOLS.includes('orchestrator.prod.dispatch')
  return {
    id: 'maestro-creative-pulse',
    status: 'PARTIAL',
    ready: allowlistOk && forbiddenOk && ORCHESTRATOR_PROD_STOPPED && !J12_ORCHESTRATOR_PROD_SHIPPED,
    path: 'lib/production/maestro-creative-pulse.ts',
    orchestratorProdShipped: false,
    j12Stopped: true,
    miniIaMayOrchestrate: false,
    conveyorNucleus: true,
    note:
      'Maestro creative pulse holds the CostGuard reservation (conveyor nucleus) and dispatches via CreativeBridge reuse; J.12 OrchestratorProd remains STOPPED; Mini-IA allowlist-only',
  }
}
