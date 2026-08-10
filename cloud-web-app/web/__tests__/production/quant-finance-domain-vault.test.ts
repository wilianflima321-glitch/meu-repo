/**
 * N1 — Finance domain vault isolation tests.
 */

import { describe, expect, it } from 'vitest'

import {
  assertFinanceDomainIsolated,
  assertStrategyCapitalNotAiByok,
  assertStrategyCapitalNotHubCoins,
  createFinanceProjectVault,
  createGameProjectScope,
  rejectCrossDomainCapitalMix,
} from '@/lib/server/quant/finance-domain-vault'

describe('finance domain vault (N1)', () => {
  it('creates sealed finance vault scopes distinct from game Yjs', () => {
    const vault = createFinanceProjectVault({
      projectId: 'proj-finance-1',
      strategyCapitalUsd: 10_000,
    })
    const game = createGameProjectScope('proj-finance-1')

    expect(vault.sealedYjsScope).toContain('finance:vault:')
    expect(game.yjsScope).toContain('game:yjs:')
    expect(vault.sealedYjsScope).not.toBe(game.yjsScope)

    const isolation = assertFinanceDomainIsolated(vault, game)
    expect(isolation.ok).toBe(true)
  })

  it('rejects Hub Coins and AI BYOK as strategy capital pools', () => {
    expect(assertStrategyCapitalNotHubCoins('hub_coins').ok).toBe(false)
    expect(assertStrategyCapitalNotAiByok('ai_byok_credits').ok).toBe(false)
    expect(assertStrategyCapitalNotHubCoins('strategy_capital').ok).toBe(true)
    expect(assertStrategyCapitalNotAiByok('strategy_capital').ok).toBe(true)
  })

  it('fail-closed on cross-domain capital pool mix', () => {
    const mix = rejectCrossDomainCapitalMix('strategy_capital', 'hub_coins')
    expect(mix.ok).toBe(false)
    if (!mix.ok) {
      expect(mix.code).toBe('capital_pool_mix')
    }
  })
})
