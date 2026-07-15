/**
 * Block 6C.6 / 6C.7 — usage meter math unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  apiEquivalentUsdRemaining,
  buildThresholdToastKey,
  formatApiEqUsd,
  isPoolAtWarnThreshold,
  poolUsagePercent,
} from '@/lib/billing/usage-meter-math'

describe('usage-meter-math (6C.6–6C.7)', () => {
  it('computes pool percent and 80% warn', () => {
    expect(poolUsagePercent(800, 1000)).toBe(80)
    expect(isPoolAtWarnThreshold(800, 1000)).toBe(true)
    expect(isPoolAtWarnThreshold(799, 1000)).toBe(false)
    expect(isPoolAtWarnThreshold(0, -1)).toBe(false)
  })

  it('educational API-eq for Fast and Premium remaining', () => {
    // 1M Fast remaining → $0.15
    expect(apiEquivalentUsdRemaining({ remaining: 1_000_000, weight: 1 })).toBeCloseTo(0.15)
    // 25K Premium raw remaining ×40 = 1M weighted → $0.15
    expect(apiEquivalentUsdRemaining({ remaining: 25_000, weight: 40 })).toBeCloseTo(0.15)
    expect(formatApiEqUsd(null)).toBe('Unlimited')
  })

  it('builds stable threshold toast keys', () => {
    expect(buildThresholdToastKey('fast80', '2026-07')).toBe('fast80:2026-07')
  })
})
