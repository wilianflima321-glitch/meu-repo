import { NextResponse } from 'next/server'

import { apiErrorToResponse } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { consumeMeteredUsage, estimateTokensFromText, type MeteringDecision } from '@/lib/metering'

export type ExpensiveAiGenerationKind = 'image' | 'model3d' | 'music' | 'voice'

export interface ExpensiveAiGenerationEstimateInput {
  kind: ExpensiveAiGenerationKind
  prompt?: string
  units?: number
  quality?: string
}

interface EnforceExpensiveAiGenerationUsageInput extends ExpensiveAiGenerationEstimateInput {
  userId: string
  route: string
}

export interface ExpensiveAiGenerationUsagePass {
  response: null
  estimatedCostTokens: number
  headers: Record<string, string>
  planId: string
}

export interface ExpensiveAiGenerationUsageBlock {
  response: NextResponse
}

export type ExpensiveAiGenerationUsageResult =
  | ExpensiveAiGenerationUsagePass
  | ExpensiveAiGenerationUsageBlock

function clampPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.floor(value))
}

function isUnlimited(value: number): boolean {
  return value === -1
}

export function estimateExpensiveAiGenerationCost(input: ExpensiveAiGenerationEstimateInput): number {
  const promptCost = input.prompt ? estimateTokensFromText(input.prompt) : 0
  const units = clampPositiveInteger(input.units, 1)
  const quality = String(input.quality || '').toLowerCase()

  switch (input.kind) {
    case 'image': {
      const perImage = quality === 'hd' || quality === 'high' ? 20_000 : 12_000
      return promptCost + perImage * Math.min(units, 8)
    }
    case 'model3d': {
      const base = quality === 'high' ? 60_000 : quality === 'draft' ? 20_000 : 35_000
      return promptCost + base
    }
    case 'music': {
      const durationSeconds = Math.min(units, 240)
      return promptCost + Math.max(15_000, durationSeconds * 900)
    }
    case 'voice': {
      const textCharacters = Math.min(units, 20_000)
      return Math.max(3_000, Math.ceil(textCharacters / 2) + promptCost)
    }
    default:
      return Math.max(1, promptCost)
  }
}

export function meteringHeaders(decision: MeteringDecision, estimatedCostTokens: number): Record<string, string> {
  return {
    'X-Aethel-Estimated-Cost-Tokens': String(estimatedCostTokens),
    ...(decision.remaining?.requestsPerHour !== undefined
      ? { 'X-Usage-Remaining-RequestsPerHour': String(decision.remaining.requestsPerHour) }
      : {}),
    ...(decision.remaining?.tokensPerDay !== undefined
      ? { 'X-Usage-Remaining-TokensPerDay': String(decision.remaining.tokensPerDay) }
      : {}),
    ...(decision.remaining?.tokensPerMonth !== undefined
      ? { 'X-Usage-Remaining-TokensPerMonth': String(decision.remaining.tokensPerMonth) }
      : {}),
  }
}

export async function enforceExpensiveAiGenerationUsage(
  input: EnforceExpensiveAiGenerationUsageInput,
): Promise<ExpensiveAiGenerationUsageResult> {
  const entitlements = await requireEntitlementsForUser(input.userId)
  const plan = entitlements.plan
  const domains = new Set(plan.allowedDomains)
  const canUseCreativeGeneration = domains.has('*') || domains.has('creative')

  if (!canUseCreativeGeneration) {
    return {
      response: NextResponse.json(
        {
          error: 'GENERATION_PLAN_REQUIRED',
          message: 'Creative generation requires a plan with the creative domain enabled.',
          plan: plan.id,
          upgradeUrl: '/pricing',
          route: input.route,
        },
        { status: 402 },
      ),
    }
  }

  const estimatedCostTokens = estimateExpensiveAiGenerationCost(input)
  if (!isUnlimited(plan.limits.tokensPerDay) && estimatedCostTokens > plan.limits.tokensPerDay) {
    return {
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

  try {
    const decision = await consumeMeteredUsage({
      userId: input.userId,
      limits: plan.limits,
      cost: {
        requests: 1,
        tokens: estimatedCostTokens,
      },
    })

    return {
      response: null,
      estimatedCostTokens,
      headers: meteringHeaders(decision, estimatedCostTokens),
      planId: plan.id,
    }
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return { response: mapped }
    throw error
  }
}
