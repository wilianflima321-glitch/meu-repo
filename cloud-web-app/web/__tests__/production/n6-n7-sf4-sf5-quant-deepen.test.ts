/**
 * N6/N7/SF4/SF5 — tick ring, market-pattern, Maestro pulse, vault pack, headless runtime.
 */

import fs from 'node:fs'

import { afterEach, describe, expect, it } from 'vitest'

import { createFinanceProjectVault } from '@/lib/server/quant/finance-domain-vault'
import {
  evaluateMaestroFinancePulse,
  probeMaestroFinancePulseReadiness,
} from '@/lib/server/quant/maestro-finance-pulse'
import {
  MARKET_PATTERN_DOMAIN,
  searchMarketPatternDomain,
  upsertMarketPatternBars,
  probeMarketPatternDomainReadiness,
} from '@/lib/server/quant/market-pattern-domain'
import {
  createMathematicalEvidenceReport,
  probeMathematicalEvidenceReadiness,
} from '@/lib/server/quant/mathematical-evidence'
import {
  buildQuantL14VaultPack,
  probeQuantL14VaultPackReadiness,
} from '@/lib/server/quant/quant-l14-vault-pack'
import {
  probeHeadlessQuantRuntimeReadiness,
  runHeadlessQuantRuntimeProbe,
} from '@/lib/server/quant/headless-quant-runtime'
import {
  createMarketTickSpscRing,
  probeTickSpscRingReadiness,
} from '@/lib/server/quant/tick-spsc-ring'
import { getVectorIndexDbPath } from '@/lib/server/vector-index/store'

describe('N6 tick SPSC ring', () => {
  it('FIFO + full/empty fail-closed', () => {
    const created = createMarketTickSpscRing(4)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const ring = created.value
    expect(
      ring.tryPush({
        symbol: 'A',
        price: 1,
        volume: 1,
        eventTimeMs: 1,
        source: 'synthetic_fixture',
        fixtureLabel: 't',
      }).ok,
    ).toBe(true)
    expect(
      ring.tryPush({
        symbol: 'A',
        price: 2,
        volume: 1,
        eventTimeMs: 2,
        source: 'synthetic_fixture',
        fixtureLabel: 't',
      }).ok,
    ).toBe(true)
    const a = ring.tryPop()
    const b = ring.tryPop()
    expect(a.ok && a.value.price).toBe(1)
    expect(b.ok && b.value.price).toBe(2)
    expect(ring.tryPop().ok).toBe(false)
    expect(probeTickSpscRingReadiness().ready).toBe(true)
    expect(probeTickSpscRingReadiness().investmentGrade).toBe(false)
  })
})

describe('N6 market-pattern domain', () => {
  const projectId = `n6-mp-${Date.now()}`
  afterEach(() => {
    try {
      const dbPath = getVectorIndexDbPath(projectId)
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
    } catch {
      /* ignore */
    }
  })

  it('indexes labeled OHLCV under market-pattern and refuses unlabeled synthetic', async () => {
    const vault = createFinanceProjectVault({ projectId, strategyCapitalUsd: 500 })
    const bad = await upsertMarketPatternBars({
      projectId,
      vault,
      bars: [
        {
          symbol: 'AAA',
          timeframe: '1d',
          open: 10,
          high: 11,
          low: 9,
          close: 10.5,
          volume: 100,
          eventTimeMs: 1,
          source: 'synthetic_fixture',
        },
      ],
    })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.code).toBe('unlabeled_synthetic')

    const ok = await upsertMarketPatternBars({
      projectId,
      vault,
      bars: [
        {
          symbol: 'AAA',
          timeframe: '1d',
          open: 10,
          high: 11,
          low: 9,
          close: 10.5,
          volume: 100,
          eventTimeMs: 1,
          fixtureLabel: 'N6-test-bar',
          source: 'synthetic_fixture',
        },
      ],
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.value.domain).toBe(MARKET_PATTERN_DOMAIN)

    const search = await searchMarketPatternDomain({
      projectId,
      vault,
      queryBar: {
        symbol: 'AAA',
        timeframe: '1d',
        open: 10,
        high: 11,
        low: 9,
        close: 10.5,
        volume: 100,
        eventTimeMs: 1,
        fixtureLabel: 'N6-test-bar',
        source: 'synthetic_fixture',
      },
    })
    expect(search.ok).toBe(true)
    if (search.ok) {
      expect(search.value.subMillisecond20yrClaim).toBe(false)
      expect(search.value.hits.length).toBeGreaterThanOrEqual(1)
      expect(search.value.hits[0].language).toBe(MARKET_PATTERN_DOMAIN)
    }
    expect(probeMarketPatternDomainReadiness().ready).toBe(true)
  })
})

describe('N7 Maestro finance pulse + math evidence', () => {
  it('vetoes elevated VPIN and forbids Mini-IA submit', () => {
    const allow = evaluateMaestroFinancePulse({
      projectId: 'p',
      strategyId: 's',
      vpinProxy: 0.1,
    })
    expect(allow.ok).toBe(true)
    if (allow.ok) {
      expect(allow.value.miniIaMaySubmit).toBe(false)
      expect(allow.value.investmentGrade).toBe(false)
      expect(allow.value.liveBrokerReady).toBe(false)
    }

    const veto = evaluateMaestroFinancePulse({
      projectId: 'p',
      strategyId: 's',
      vpinProxy: 0.95,
    })
    expect(veto.ok).toBe(false)
    if (!veto.ok) expect(veto.code).toBe('pulse_vetoed')

    const mini = evaluateMaestroFinancePulse(
      { projectId: 'p', strategyId: 's', vpinProxy: 0.1 },
      { miniIaAttemptSubmit: true },
    )
    expect(mini.ok).toBe(false)
    if (!mini.ok) expect(mini.code).toBe('mini_ia_submit_forbidden')

    const ev = createMathematicalEvidenceReport({
      kind: 'pulse_veto',
      projectId: 'p',
      strategyId: 's',
      summary: 'test',
      metrics: { x: 1 },
      createdAt: '2026-08-10T12:00:00.000Z',
    })
    expect(ev.ok).toBe(true)
    if (ev.ok) {
      expect(ev.value.capnpReady).toBe(false)
      expect(ev.value.miniIaMaySubmit).toBe(false)
    }
    expect(probeMaestroFinancePulseReadiness().ready).toBe(true)
    expect(probeMathematicalEvidenceReadiness().ready).toBe(true)
  })
})

describe('SF4 quant L.14 vault pack', () => {
  it('builds finance pack and rejects game surfaces', () => {
    const vault = createFinanceProjectVault({ projectId: 'sf4', strategyCapitalUsd: 10 })
    const ok = buildQuantL14VaultPack({
      vault,
      marketPatternRefs: ['market-pattern://X/1d'],
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.value.firecrackerReady).toBe(false)
      expect(ok.value.investmentGrade).toBe(false)
    }
    const bad = buildQuantL14VaultPack({ vault, attemptedGameSurfaces: ['code'] })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.code).toBe('game_surface_in_finance')
    expect(probeQuantL14VaultPackReadiness().ready).toBe(true)
  })
})

describe('SF5 headless quant runtime', () => {
  it('runs tick soak without UI and never claims FIX', () => {
    const run = runHeadlessQuantRuntimeProbe({ projectId: `sf5-${Date.now()}` })
    expect(run.ok).toBe(true)
    if (run.ok) {
      expect(run.value.ranWithoutUi).toBe(true)
      expect(run.value.ticksDrained).toBe(3)
      expect(run.value.fixBinaryReady).toBe(false)
      expect(run.value.liveBrokerReady).toBe(false)
      expect(run.value.investmentGrade).toBe(false)
    }
    expect(probeHeadlessQuantRuntimeReadiness().ready).toBe(true)
  })
})
