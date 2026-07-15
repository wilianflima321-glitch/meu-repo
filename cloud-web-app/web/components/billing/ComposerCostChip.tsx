'use client'

/**
 * Block 6H.3 — Composer pre-send cost chip (PAYG §4.5).
 */

import { useMemo } from 'react'
import { estimateComposerCost } from '@/lib/billing/composer-cost-estimate'
import { isUltraModel } from '@/lib/ai/model-cost-weights'

type Props = {
  modelId: string
  promptText: string
  byokActive?: boolean
  walletBalance?: number
  paygEnabled?: boolean
}

export function ComposerCostChip({
  modelId,
  promptText,
  byokActive = false,
  walletBalance = 0,
  paygEnabled = false,
}: Props) {
  const estimate = useMemo(
    () =>
      estimateComposerCost({
        modelId,
        promptChars: promptText.length,
      }),
    [modelId, promptText],
  )

  if (byokActive) {
    return (
      <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--aethel-success)]">
        BYOK · $0 platform
      </span>
    )
  }

  const ultraBlocked =
    isUltraModel(modelId) && walletBalance <= 0 && !paygEnabled && !byokActive

  return (
    <span
      title={
        ultraBlocked
          ? 'Ultra models need wallet credits, PAYG, or BYOK before send.'
          : 'Educational pre-send estimate (API-eq). Not a hard charge.'
      }
      className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
        ultraBlocked
          ? 'border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
          : 'border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-tertiary)]'
      }`}
    >
      {estimate.label}
    </span>
  )
}

export default ComposerCostChip
