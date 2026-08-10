/**
 * N4 — Market-data ingest stub tests (synthetic fixtures labeled).
 */

import { describe, expect, it } from 'vitest'

import {
  computeStdDev,
  createFailClosedMarketDataIngest,
  createSyntheticFixtureIngest,
  probeMarketDataIngestReadiness,
  zScoreOutlierReject,
} from '@/lib/server/quant/market-data-ingest'

describe('market-data ingest (N4)', () => {
  it('fail-closed adapter rejects all ticks without licensed feed', () => {
    const adapter = createFailClosedMarketDataIngest()
    expect(adapter.licensed).toBe(false)

    const result = adapter.ingest({
      symbol: 'AAPL',
      price: 150.25,
      volume: 100,
      eventTimeMs: Date.now(),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('NO_LICENSED_FEED')
  })

  it('accepts labeled synthetic fixture ticks', () => {
    const adapter = createSyntheticFixtureIngest({
      label: 'N4-unit-fixture-AAPL',
      ticks: [],
    })

    const result = adapter.ingest({
      symbol: 'AAPL',
      price: 150,
      volume: 50,
      eventTimeMs: 1_700_000_000_000,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tick.source).toBe('synthetic_fixture')
    expect(result.tick.fixtureLabel).toBe('N4-unit-fixture-AAPL')
  })

  it('rejects Z-score outliers on fixture stream', () => {
    const adapter = createSyntheticFixtureIngest({
      label: 'N4-zscore-fixture',
      ticks: [],
    })

    const baseline = [100, 101, 99.5, 100.2, 100.1]
    for (const price of baseline) {
      adapter.ingest({ symbol: 'PROBE', price, volume: 1, eventTimeMs: 0 })
    }

    const outlier = adapter.ingest({
      symbol: 'PROBE',
      price: 500,
      volume: 1,
      eventTimeMs: 1,
    })

    expect(outlier.ok).toBe(false)
    if (outlier.ok) return
    expect(outlier.reason).toBe('ZSCORE_OUTLIER')
  })

  it('zScoreOutlierReject math matches threshold', () => {
    const history = [10, 10, 10, 10, 10]
    const flat = zScoreOutlierReject(history, 10)
    expect(flat.reject).toBe(false)

    const spread = [90, 95, 100, 105, 110]
    const out = zScoreOutlierReject(spread, 200, 3)
    expect(out.reject).toBe(true)
    expect(out.zScore).not.toBeNull()
  })

  it('computeStdDev handles small samples', () => {
    expect(computeStdDev([])).toBe(0)
    expect(computeStdDev([5])).toBe(0)
    expect(computeStdDev([0, 10])).toBe(5)
  })

  it('probe reports N4 stub readiness', () => {
    const probe = probeMarketDataIngestReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.failClosedWorks).toBe(true)
    expect(probe.fixtureIngestWorks).toBe(true)
    expect(probe.zScoreRejectWorks).toBe(true)
  })
})
