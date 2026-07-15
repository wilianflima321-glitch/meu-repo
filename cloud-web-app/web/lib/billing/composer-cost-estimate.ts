/**
 * Block 6H.3 — Composer pre-send cost estimate (PAYG §4.5).
 */

import { getModelTokenWeight, isUltraModel } from '@/lib/ai/model-cost-weights'
import { USAGE_API_EQ_USD_PER_M, formatTokenCount } from '@/lib/billing/usage-meter-math'

export type ComposerCostClass = 'fast' | 'premium' | 'ultra'

export type ComposerCostEstimate = {
  class: ComposerCostClass
  estimatedRawTokens: number
  weight: number
  estimatedWeightedTokens: number
  estimatedUsd: number
  label: string
}

export function formatComposerCostChip(estimate: {
  class: ComposerCostClass
  estimatedRawTokens: number
  estimatedUsd: number
}): string {
  const tok = formatTokenCount(estimate.estimatedRawTokens)
  if (estimate.class === 'ultra') {
    return 'Ultra · wallet'
  }
  if (estimate.class === 'premium') {
    const usd =
      estimate.estimatedUsd < 0.01 && estimate.estimatedUsd > 0
        ? '<$0.01'
        : `~$${estimate.estimatedUsd.toFixed(2)}`
    return `~${tok} Prem · ${usd}`
  }
  return `~${tok} Fast`
}

export function estimateComposerCost(input: {
  modelId: string
  promptChars: number
  expectedCompletionTokens?: number
}): ComposerCostEstimate {
  const promptTokens = Math.max(1, Math.ceil(Math.max(0, input.promptChars) / 4))
  const completion = Math.max(64, Math.floor(input.expectedCompletionTokens ?? 512))
  const estimatedRawTokens = promptTokens + completion
  const weight = getModelTokenWeight(input.modelId || '')
  const estimatedWeightedTokens = Math.ceil(estimatedRawTokens * weight)
  const estimatedUsd = (estimatedWeightedTokens / 1_000_000) * USAGE_API_EQ_USD_PER_M

  let costClass: ComposerCostClass = 'fast'
  if (isUltraModel(input.modelId)) costClass = 'ultra'
  else if (weight >= 40) costClass = 'premium'

  const base = {
    class: costClass,
    estimatedRawTokens,
    weight,
    estimatedWeightedTokens,
    estimatedUsd,
  }
  return {
    ...base,
    label: formatComposerCostChip(base),
  }
}
