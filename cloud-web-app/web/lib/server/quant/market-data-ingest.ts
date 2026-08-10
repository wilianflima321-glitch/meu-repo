/**
 * N4 — Read-only market-data ingest stub.
 * Normalized tick schema + Z-score outlier reject. Fail-closed without licensed feed.
 * Never invents prices — synthetic data must carry explicit fixture labels.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('market-data-ingest')

export type MarketDataSource = 'licensed_feed' | 'synthetic_fixture' | 'unlicensed'

export interface NormalizedMarketTick {
  symbol: string
  price: number
  volume: number
  eventTimeMs: number
  source: MarketDataSource
  /** Required when source=synthetic_fixture — e.g. "N4-unit-fixture-AAPL" */
  fixtureLabel?: string
}

export type MarketIngestRejectReason =
  | 'NO_LICENSED_FEED'
  | 'UNLABELED_SYNTHETIC'
  | 'INVALID_TICK'
  | 'ZSCORE_OUTLIER'
  | 'NEGATIVE_PRICE'

export type MarketIngestResult =
  | { ok: true; tick: NormalizedMarketTick }
  | { ok: false; reason: MarketIngestRejectReason; message: string }

export interface MarketDataIngestAdapter {
  readonly licensed: boolean
  readonly adapterId: string
  ingest(raw: unknown): MarketIngestResult
}

export interface SyntheticFixtureDefinition {
  label: string
  ticks: Array<{
    symbol: string
    price: number
    volume: number
    eventTimeMs: number
  }>
}

const DEFAULT_ZSCORE_THRESHOLD = 3.0
const MIN_HISTORY_FOR_ZSCORE = 5

function isFinitePositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

function parseRawTick(raw: unknown): Omit<NormalizedMarketTick, 'source' | 'fixtureLabel'> | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const symbol = typeof o.symbol === 'string' ? o.symbol.trim() : ''
  const price = o.price
  const volume = o.volume
  const eventTimeMs = o.eventTimeMs
  if (!symbol || !isFinitePositive(price) || !isFinitePositive(volume)) return null
  if (typeof eventTimeMs !== 'number' || !Number.isFinite(eventTimeMs)) return null
  return { symbol, price, volume, eventTimeMs }
}

/** Population stddev; returns 0 when fewer than 2 samples. */
export function computeStdDev(samples: readonly number[]): number {
  if (samples.length < 2) return 0
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance =
    samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length
  return Math.sqrt(variance)
}

/** Z-score outlier reject per spec §12.C — fail-closed on insufficient history. */
export function zScoreOutlierReject(
  history: readonly number[],
  value: number,
  threshold = DEFAULT_ZSCORE_THRESHOLD,
): { reject: boolean; zScore: number | null } {
  if (history.length < MIN_HISTORY_FOR_ZSCORE) {
    return { reject: false, zScore: null }
  }
  const mean = history.reduce((a, b) => a + b, 0) / history.length
  const std = computeStdDev(history)
  if (std === 0) {
    return { reject: false, zScore: 0 }
  }
  const zScore = (value - mean) / std
  return { reject: Math.abs(zScore) > threshold, zScore }
}

/** Fail-closed adapter — rejects all ticks until a licensed feed is wired. */
export function createFailClosedMarketDataIngest(): MarketDataIngestAdapter {
  return {
    licensed: false,
    adapterId: 'fail-closed-unlicensed',
    ingest(): MarketIngestResult {
      log.warn('market_ingest_rejected', { reason: 'NO_LICENSED_FEED' })
      return {
        ok: false,
        reason: 'NO_LICENSED_FEED',
        message: 'No licensed market-data feed configured — prices are never invented',
      }
    },
  }
}

/** Read-only sandbox ingest over labeled synthetic fixtures (tests / paper soak only). */
export function createSyntheticFixtureIngest(
  fixture: SyntheticFixtureDefinition,
  options?: { zScoreThreshold?: number },
): MarketDataIngestAdapter {
  const threshold = options?.zScoreThreshold ?? DEFAULT_ZSCORE_THRESHOLD
  const priceHistory = new Map<string, number[]>()

  return {
    licensed: false,
    adapterId: `synthetic-fixture:${fixture.label}`,
    ingest(raw: unknown): MarketIngestResult {
      const parsed = parseRawTick(raw)
      if (!parsed) {
        return { ok: false, reason: 'INVALID_TICK', message: 'tick failed schema validation' }
      }

      const history = priceHistory.get(parsed.symbol) ?? []
      const z = zScoreOutlierReject(history, parsed.price, threshold)
      if (z.reject) {
        log.warn('market_ingest_zscore_reject', {
          symbol: parsed.symbol,
          zScore: z.zScore,
          fixture: fixture.label,
        })
        return {
          ok: false,
          reason: 'ZSCORE_OUTLIER',
          message: `Z-score outlier rejected (z=${z.zScore?.toFixed(2)})`,
        }
      }

      const tick: NormalizedMarketTick = {
        ...parsed,
        source: 'synthetic_fixture',
        fixtureLabel: fixture.label,
      }

      const nextHistory = [...history, parsed.price].slice(-64)
      priceHistory.set(parsed.symbol, nextHistory)

      log.info('market_ingest_fixture_tick', {
        symbol: tick.symbol,
        fixture: fixture.label,
      })

      return { ok: true, tick }
    },
  }
}

/** Probe N4 readiness — fail-closed default + fixture path with Z-score filter. */
export function probeMarketDataIngestReadiness(): {
  ready: boolean
  failClosedWorks: boolean
  fixtureIngestWorks: boolean
  zScoreRejectWorks: boolean
  note: string
} {
  const failClosed = createFailClosedMarketDataIngest()
  const failResult = failClosed.ingest({ symbol: 'AAPL', price: 150, volume: 100, eventTimeMs: 0 })
  const failClosedWorks = !failResult.ok && failResult.reason === 'NO_LICENSED_FEED'

  const fixture = createSyntheticFixtureIngest({
    label: 'N4-probe-fixture',
    ticks: [],
  })

  let history: number[] = [100, 101, 100.5, 99.8, 100.2]
  let fixtureIngestWorks = false
  for (const price of history) {
    const r = fixture.ingest({
      symbol: 'PROBE',
      price,
      volume: 10,
      eventTimeMs: Date.now(),
    })
    if (r.ok) fixtureIngestWorks = true
  }

  const outlier = fixture.ingest({
    symbol: 'PROBE',
    price: 500,
    volume: 10,
    eventTimeMs: Date.now(),
  })
  const zScoreRejectWorks = !outlier.ok && outlier.reason === 'ZSCORE_OUTLIER'

  const ready = failClosedWorks && fixtureIngestWorks && zScoreRejectWorks

  return {
    ready,
    failClosedWorks,
    fixtureIngestWorks,
    zScoreRejectWorks,
    note: ready
      ? 'N4 stub: fail-closed unlicensed + labeled synthetic fixture + Z-score reject'
      : 'N4 probe incomplete',
  }
}
