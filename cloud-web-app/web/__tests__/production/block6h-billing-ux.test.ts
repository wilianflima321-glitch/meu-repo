/**
 * Block 6H — billing UX unit tests (composer chip + quota CTA order).
 */

import { describe, expect, it } from 'vitest'
import {
  estimateComposerCost,
  formatComposerCostChip,
} from '@/lib/billing/composer-cost-estimate'
import {
  AI_QUOTA_CTA_ORDER,
  calmQuotaMessage,
  normalizeAiQuotaBlocked,
  sortQuotaActions,
} from '@/lib/billing/ai-quota-blocked'
import { formatAiUsageStatusChip } from '@/components/billing/AiUsageStatusChip'

describe('composer-cost-estimate (6H.3)', () => {
  it('labels Fast models with token estimate', () => {
    const est = estimateComposerCost({
      modelId: 'openai/gpt-4o-mini',
      promptChars: 400,
    })
    expect(est.class).toBe('fast')
    expect(est.label).toMatch(/Fast/)
    expect(formatComposerCostChip(est)).toBe(est.label)
  })

  it('labels Ultra as wallet path', () => {
    const est = estimateComposerCost({
      modelId: 'anthropic/claude-opus-4',
      promptChars: 100,
    })
    expect(est.class).toBe('ultra')
    expect(est.label).toBe('Ultra · wallet')
  })
})

describe('ai-quota-blocked (6H.4)', () => {
  it('sorts CTAs in binding order', () => {
    const sorted = sortQuotaActions([
      { type: 'upgrade', href: '/pricing' },
      { type: 'buy_credits', href: '/billing' },
      { type: 'connect_byok', href: '/settings?tab=byok' },
      { type: 'enable_payg', href: '/billing?tab=payg' },
    ])
    expect(sorted.map((a) => a.type)).toEqual([
      'buy_credits',
      'enable_payg',
      'connect_byok',
      'upgrade',
    ])
    expect(AI_QUOTA_CTA_ORDER[0]).toBe('buy_credits')
  })

  it('normalizes spend-session ctas and forces ideLocked false', () => {
    const normalized = normalizeAiQuotaBlocked({
      error: 'QUOTA_EXCEEDED',
      message: 'Account suspended for overage',
      ctas: [
        { id: 'upgrade', label: 'Upgrade plan', href: '/pricing' },
        { id: 'buy_credits', label: 'Buy AI credits', href: '/billing' },
      ],
    })
    expect(normalized).not.toBeNull()
    expect(normalized!.ideLocked).toBe(false)
    expect(normalized!.message.toLowerCase()).not.toContain('suspended')
    expect(normalized!.actions[0].type).toBe('buy_credits')
  })

  it('rewrites banned microcopy', () => {
    expect(calmQuotaMessage('You are banned')).toMatch(/IDE stays open/i)
  })
})

describe('AiUsageStatusChip format (6H.2)', () => {
  it('formats Fast · Prem · Extra', () => {
    expect(formatAiUsageStatusChip({ fastPct: 62.4, premPct: 18.1, extraUsd: 4.2 })).toBe(
      'Fast 62% · Prem 18% · Extra $4.20',
    )
  })
})
