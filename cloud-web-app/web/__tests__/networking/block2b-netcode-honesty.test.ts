/**
 * Block 2B — Netcode protocol honesty (binary hot path, rollback replay, MP honesty).
 */

import { describe, expect, it } from 'vitest'
import {
  BINARY_HOTPATH_VERSION,
  decodeHotpathEntities,
  encodeHotpathEntities,
  makeHotpathFixture,
  microbenchHotpathRoundTrip,
} from '@/lib/networking/binary-hotpath-serializer'
import { runDeterministicReplayFixture } from '@/lib/networking/deterministic-rollback-replay'
import {
  evaluateMultiplayerHonesty,
  redactSimulatedDedicatedUrl,
} from '@/lib/production/multiplayer-honesty-capability'

describe('Block 2B.1 binary hotpath serializer', () => {
  it('round-trips 64 entities without JSON', () => {
    const entities = makeHotpathFixture(64)
    const buf = encodeHotpathEntities(entities)
    const decoded = decodeHotpathEntities(buf)
    expect(decoded).toHaveLength(64)
    for (let i = 0; i < 64; i++) {
      expect(decoded[i].id).toBe(entities[i].id)
      expect(decoded[i].flags).toBe(entities[i].flags)
      expect(decoded[i].posX).toBeCloseTo(entities[i].posX, 5)
      expect(decoded[i].posY).toBeCloseTo(entities[i].posY, 5)
      expect(decoded[i].posZ).toBeCloseTo(entities[i].posZ, 5)
      expect(decoded[i].velX).toBeCloseTo(entities[i].velX, 5)
      expect(decoded[i].velZ).toBeCloseTo(entities[i].velZ, 5)
    }
    const view = new DataView(buf)
    expect(view.getUint16(2, true)).toBe(BINARY_HOTPATH_VERSION)
  })

  it('microbench average < 0.1ms for 64 entities', () => {
    const avgMs = microbenchHotpathRoundTrip(64, 300)
    expect(avgMs).toBeLessThan(0.1)
  })
})

describe('Block 2B.2 deterministic rollback replay', () => {
  it('bit-identical forward replay + convergent rollback', () => {
    const result = runDeterministicReplayFixture()
    expect(result.baselineHash).toBe(result.replayHash)
    expect(result.afterRollbackA).toBe(result.afterRollbackB)
    expect(result.afterRollbackA.length).toBeGreaterThan(0)
  })
})

describe('Block 2B.3 multiplayer honesty', () => {
  it('holds dedicated when Agones unconfigured', () => {
    const report = evaluateMultiplayerHonesty({
      agonesAllocatorConfigured: false,
      lastAllocationSimulated: true,
    })
    expect(report.dedicated.status).toBe('held')
    expect(report.dedicated.connectable).toBe(false)
    expect(report.marketingDedicatedAllowed).toBe(false)
    expect(report.marketingCrossPlayAllowed).toBe(false)
    expect(report.p2pLan.status).toBe('live')
    expect(report.productCopy).toMatch(/\[HELD\]/)
  })

  it('allows dedicated marketing only when live + connectable', () => {
    const report = evaluateMultiplayerHonesty({
      agonesAllocatorConfigured: true,
      lastAllocationSimulated: false,
      crossPlayMarketingUnlocked: true,
      rollbackDeterministicProven: true,
    })
    expect(report.dedicated.status).toBe('live')
    expect(report.marketingDedicatedAllowed).toBe(true)
    expect(report.marketingCrossPlayAllowed).toBe(true)
  })

  it('redacts simulated dedicated URLs', () => {
    expect(
      redactSimulatedDedicatedUrl(
        'wss://simulated-dedicated.aethel.local/us-east/m1',
        true
      )
    ).toBeUndefined()
    expect(redactSimulatedDedicatedUrl('wss://gs.example.com:7777', false)).toBe(
      'wss://gs.example.com:7777'
    )
  })
})
