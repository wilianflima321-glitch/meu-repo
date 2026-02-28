import type { PlanId } from '@/lib/plans'
import type { AssetQualityReport } from '@/lib/server/asset-quality'

type EntitlementSource = 'subscription' | 'trial'

export type AssetIntakePolicyDecision = {
  allowed: boolean
  minScore: number
  score: number
  policyTier: 'strict' | 'balanced' | 'flexible'
  reason: string | null
  metadata: {
    planId: PlanId
    source: EntitlementSource
    qualityTier: AssetQualityReport['tier']
    recommendedActions: string[]
  }
}

function getMinScoreByPlan(planId: PlanId): number {
  switch (planId) {
    case 'starter':
      return 55
    case 'basic':
      return 50
    case 'pro':
      return 40
    case 'studio':
      return 30
    case 'enterprise':
      return 20
    default:
      return 55
  }
}

function getPolicyTier(minScore: number): AssetIntakePolicyDecision['policyTier'] {
  if (minScore >= 55) return 'strict'
  if (minScore >= 40) return 'balanced'
  return 'flexible'
}

export function evaluateAssetIntakePolicy(input: {
  planId: PlanId
  source: EntitlementSource
  quality: AssetQualityReport
}): AssetIntakePolicyDecision {
  const minScore = getMinScoreByPlan(input.planId)
  const score = input.quality.score
  const allowed = score >= minScore
  const policyTier = getPolicyTier(minScore)

  return {
    allowed,
    minScore,
    score,
    policyTier,
    reason: allowed
      ? null
      : `Asset quality score ${score} is below the ${input.planId} intake threshold (${minScore}).`,
    metadata: {
      planId: input.planId,
      source: input.source,
      qualityTier: input.quality.tier,
      recommendedActions: input.quality.recommendedActions,
    },
  }
}
