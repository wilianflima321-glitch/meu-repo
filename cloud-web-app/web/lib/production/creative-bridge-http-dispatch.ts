/**
 * Law XVI — HTTP choke for expensive creative generate routes.
 * Replaces bare enforceExpensiveAiGenerationUsage + direct provider calls.
 * Custody: entitlements → CostGuard (via Bridge) → Provider → Evidence → settle
 */

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  estimateExpensiveAiGenerationCost,
  meteringHeaders,
  type ExpensiveAiGenerationKind,
} from '@/lib/server/ai-expensive-generation-guard'
import {
  dispatchCreativeArtifact,
  type CreativeArtifactDomain,
  type CreativeArtifactResult,
} from './creative-artifact-bridge'
import { createCreativeWalletCostGuardAdapter } from './creative-cost-guard-creative-wallet-adapter'
import type { CostGuardBlockReason, CostGuardLedgerAdapter } from './creative-cost-guard'
import type { MeteringCostGuardAdapter } from './creative-cost-guard-metering-adapter'
import type { PlanLimits } from '@/lib/plans'
import type { MeteringDecision } from '@/lib/metering'

const log = createComponentLogger('creative-bridge-http-dispatch')

const KIND_TO_DOMAIN: Record<ExpensiveAiGenerationKind, CreativeArtifactDomain> = {
  image: 'image',
  model3d: 'mesh',
  music: 'music',
  video: 'video',
  voice: 'voice',
  voiceTranscribe: 'voice',
}

export interface ExpensiveCreativeExecuteContext {
  estimatedCostTokens: number
  reservationId: string
}

export interface ExpensiveCreativeExecuteResult<T> {
  artifactId: string
  previewUrl?: string
  costUsd?: number
  actualTokenWeight?: number
  empty?: boolean
  data: T
}

export interface RunExpensiveCreativeViaBridgeInput<T> {
  userId: string
  route: string
  kind: ExpensiveAiGenerationKind
  prompt: string
  units?: number
  quality?: string
  projectId?: string
  byokProfileId?: string
  requiredDomain?: string
  domainLabel?: string
  /** Override Bridge domain; defaults from kind */
  domain?: CreativeArtifactDomain
  providerName: string
  execute: (
    ctx: ExpensiveCreativeExecuteContext,
  ) => Promise<ExpensiveCreativeExecuteResult<T>>
}

export interface ExpensiveCreativeBridgePass<T> {
  ok: true
  data: T
  estimatedCostTokens: number
  headers: Record<string, string>
  planId: string
  artifactId: string
  evidenceReceiptId: string
  reservationId?: string
  provider: string
}

export interface ExpensiveCreativeBridgeBlock {
  ok: false
  response: NextResponse
  /** When provider failed after CostGuard — routes may map content_policy etc. */
  providerError?: string
}

export type ExpensiveCreativeBridgeResult<T> =
  | ExpensiveCreativeBridgePass<T>
  | ExpensiveCreativeBridgeBlock

export interface CreativeBridgeHttpDeps {
  requireEntitlements: typeof requireEntitlementsForUser
  hasByok: (userId: string, byokProfileId?: string) => Promise<boolean>
  createAdapter: (input: {
    userId: string
    planLimits: PlanLimits
  }) => MeteringCostGuardAdapter | CostGuardLedgerAdapter
  dispatch: typeof dispatchCreativeArtifact
}

function isUnlimited(value: number): boolean {
  return value === -1
}

function domainAllows(domains: Set<string>, requiredDomain: string): boolean {
  return domains.has('*') || domains.has('all') || domains.has(requiredDomain)
}

function costGuardStatus(reason: CostGuardBlockReason | string | undefined): number {
  switch (reason) {
    case 'free_tier_platform_pay_forbidden':
    case 'byok_missing':
    case 'credits_exhausted':
    case 'cost_guard_denied':
      return 402
    case 'invalid_estimate':
      return 400
    case 'empty_artifact':
      return 422
    case 'transaction_aborted':
    case 'scope_violation':
      return 409
    default:
      return 500
  }
}

function mapBlockedToResponse(
  result: CreativeArtifactResult,
  input: { route: string; planId: string; estimatedCostTokens: number },
): NextResponse {
  const reason = result.blockedReason ?? 'cost_guard_denied'
  const status = costGuardStatus(reason)

  if (reason === 'provider_down') {
    return NextResponse.json(
      {
        error: 'CREATIVE_PROVIDER_FAILED',
        message: result.providerError || 'Creative provider failed',
        blockedReason: reason,
        route: input.route,
        evidenceReceiptId: result.evidenceReceiptId,
      },
      { status: 502 },
    )
  }

  return NextResponse.json(
    {
      error: 'CREATIVE_COST_GUARD_DENIED',
      blockedReason: reason,
      message:
        reason === 'free_tier_platform_pay_forbidden'
          ? 'Free tier requires BYOK for paid creative providers — platform does not absorb cost.'
          : reason === 'empty_artifact'
            ? 'Law XVI forbids success with an empty creative artifact.'
            : reason === 'credits_exhausted'
              ? 'Insufficient AI pool / credits for this generation.'
              : `Creative dispatch blocked: ${reason}`,
      plan: input.planId,
      estimatedCostTokens: input.estimatedCostTokens,
      upgradeUrl: '/pricing',
      route: input.route,
      evidenceReceiptId: result.evidenceReceiptId,
    },
    { status },
  )
}

/**
 * Block 6E — BYOK is client-header / byokProfileId only.
 * Never read User.byokKey (server vault retired). Creative client keys = Wave 6F.
 */
export async function defaultHasByok(
  _userId: string,
  byokProfileId?: string,
): Promise<boolean> {
  return Boolean(byokProfileId?.trim())
}

export function createDefaultSpendCostGuardAdapter(input: {
  userId: string
  planId: string
  planLimits: PlanLimits
  hasByok: (userId: string, byokProfileId?: string) => Promise<boolean>
  modality?: string
}): CostGuardLedgerAdapter & { getLastDecision?: () => MeteringDecision | null } {
  // Block 6F — Creative Wallet only (never LLM UsageBucket / Fast·Premium)
  void input.userId
  void input.planId
  void input.planLimits
  return createCreativeWalletCostGuardAdapter({
    hasByok: input.hasByok,
    modality: input.modality,
  })
}

/**
 * Single entry for expensive creative generate HTTP routes (image/music/voice/3d/video).
 * Debits Creative Wallet only (Block 6F) — never LLM Fast/Premium pools.
 */
export async function runExpensiveCreativeViaBridge<T>(
  input: RunExpensiveCreativeViaBridgeInput<T>,
  deps: Partial<CreativeBridgeHttpDeps> = {},
): Promise<ExpensiveCreativeBridgeResult<T>> {
  const hasByokFn = deps.hasByok ?? defaultHasByok
  const requireEntitlements = deps.requireEntitlements ?? requireEntitlementsForUser
  const dispatch = deps.dispatch ?? dispatchCreativeArtifact

  const requiredDomain = input.requiredDomain ?? 'creative'
  const domainLabel = input.domainLabel ?? 'Creative generation'
  const artifactDomain = input.domain ?? KIND_TO_DOMAIN[input.kind]
  const projectId = input.projectId || ['http', input.kind].join('-')

  const entitlements = await requireEntitlements(input.userId)
  const plan = entitlements.plan
  const domains = new Set(plan.allowedDomains)

  const createAdapter =
    deps.createAdapter ??
    (({ planLimits }: { userId: string; planLimits: PlanLimits }) =>
      createDefaultSpendCostGuardAdapter({
        userId: input.userId,
        planId: plan.id,
        planLimits,
        hasByok: hasByokFn,
        modality: input.kind,
      }))

  if (!domainAllows(domains, requiredDomain)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'GENERATION_PLAN_REQUIRED',
          message: `${domainLabel} requires a plan with the ${requiredDomain} domain enabled.`,
          plan: plan.id,
          upgradeUrl: '/pricing',
          route: input.route,
          requiredDomain,
        },
        { status: 402 },
      ),
    }
  }

  const estimatedCostTokens = estimateExpensiveAiGenerationCost({
    kind: input.kind,
    prompt: input.prompt,
    units: input.units,
    quality: input.quality,
  })

  if (!isUnlimited(plan.limits.tokensPerDay) && estimatedCostTokens > plan.limits.tokensPerDay) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'GENERATION_TOO_EXPENSIVE_FOR_PLAN',
          message: 'This generation exceeds the single-job safety budget for your plan.',
          plan: plan.id,
          estimatedCostTokens,
          tokensPerDay: plan.limits.tokensPerDay,
          upgradeUrl: '/pricing',
          route: input.route,
        },
        { status: 413 },
      ),
    }
  }

  const adapter = createAdapter({
    userId: input.userId,
    planLimits: plan.limits,
  })

  let capturedData: T | undefined
  let executeThrew: Error | undefined

  const { result } = await dispatch({
    request: {
      domain: artifactDomain,
      prompt: input.prompt || `${input.kind} generation`,
      projectId,
      userId: input.userId,
      evidenceKind: `http:${input.route}`,
      costGuard: {
        byokProfileId: input.byokProfileId,
        estimatedTokenWeight: estimatedCostTokens,
        planId: plan.id,
      },
      requiresFusionWrite: false,
    },
    adapter,
    provider: async ({ reservationId }) => {
      try {
        const executed = await input.execute({
          estimatedCostTokens,
          reservationId,
        })
        capturedData = executed.data
        return {
          artifactId: executed.artifactId || randomUUID(),
          previewUrl: executed.previewUrl,
          provider: input.providerName,
          costUsd: executed.costUsd ?? 0,
          actualTokenWeight: executed.actualTokenWeight ?? estimatedCostTokens,
          empty: executed.empty === true || !executed.artifactId,
        }
      } catch (err) {
        executeThrew = err instanceof Error ? err : new Error(String(err))
        throw executeThrew
      }
    },
  })

  if (!result.success) {
    log.warn('creative_http_bridge_blocked', {
      route: input.route,
      blockedReason: result.blockedReason,
      userId: input.userId,
    })
    const block: ExpensiveCreativeBridgeBlock = {
      ok: false,
      response: mapBlockedToResponse(result, {
        route: input.route,
        planId: plan.id,
        estimatedCostTokens,
      }),
      providerError: result.providerError ?? executeThrew?.message,
    }
    // Prefer original provider error message on 502 body
    if (result.blockedReason === 'provider_down' && block.providerError) {
      block.response = NextResponse.json(
        {
          error: 'CREATIVE_PROVIDER_FAILED',
          message: block.providerError,
          blockedReason: 'provider_down',
          route: input.route,
          evidenceReceiptId: result.evidenceReceiptId,
        },
        { status: 502 },
      )
    }
    return block
  }

  if (capturedData === undefined) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'CREATIVE_ARTIFACT_MISSING',
          message: 'Bridge succeeded without payload — refuse empty success (Law XVI).',
          route: input.route,
        },
        { status: 422 },
      ),
    }
  }

  const lastDecision: MeteringDecision | null =
    'getLastDecision' in adapter && typeof adapter.getLastDecision === 'function'
      ? adapter.getLastDecision()
      : null

  const headers = lastDecision
    ? meteringHeaders(lastDecision, estimatedCostTokens)
    : {
        'X-Aethel-Estimated-Cost-Tokens': String(estimatedCostTokens),
        'X-Aethel-Creative-Bridge': '1',
      }

  headers['X-Aethel-Creative-Bridge'] = '1'
  if (result.evidenceReceiptId) {
    headers['X-Aethel-Evidence-Receipt'] = result.evidenceReceiptId
  }

  log.info('creative_http_bridge_ok', {
    route: input.route,
    artifactId: result.artifactId,
    domain: artifactDomain,
  })

  return {
    ok: true,
    data: capturedData,
    estimatedCostTokens,
    headers,
    planId: plan.id,
    artifactId: result.artifactId,
    evidenceReceiptId: result.evidenceReceiptId,
    reservationId: result.reservationId,
    provider: result.provider,
  }
}
