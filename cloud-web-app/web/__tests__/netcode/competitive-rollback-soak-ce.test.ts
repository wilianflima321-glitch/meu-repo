/**
 * Letter ce — Competitive rollback GameLoop soak + authority wire.
 * Dual-peer determinism + late resim; ggpoLive / marketing stay HELD.
 */

import { describe, expect, it } from 'vitest'
import {
  buildCompetitiveSoakTape,
  runCompetitiveRollbackSoak,
  tickCompetitiveAuthority,
  COMPETITIVE_ROLLBACK_SOAK_LETTER,
  GGPO_LIVE_HELD,
} from '@/lib/netcode/competitive-rollback-soak'
import {
  proveCompetitiveRollbackSoak,
  probeCompetitiveRollbackHonesty,
} from '@/lib/netcode/competitive-rollback-honesty'
import {
  createFixedPointRollbackSession,
  fixedInputFromAxes,
} from '@/lib/netcode/fixed-point-rollback-session'
import { evaluateFixedPointNetcodeHonesty } from '@/lib/netcode/fixed-point'
import { resolvePhysicsAuthorityMode } from '@/lib/netcode/competitive-sim-mode'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'

describe('competitive rollback soak (ce)', () => {
  it('dual-peer identical tape + late resim + rollbackTo pass', () => {
    const soak = runCompetitiveRollbackSoak({ frames: 32, correctAtTick: 8 })
    expect(soak.letter).toBe(COMPETITIVE_ROLLBACK_SOAK_LETTER)
    expect(soak.passed).toBe(true)
    expect(soak.peerHashesMatch).toBe(true)
    expect(soak.lateResimHashesMatch).toBe(true)
    expect(soak.rollbackRestoreOk).toBe(true)
    expect(soak.finalHash.length).toBeGreaterThan(0)
  })

  it('buildCompetitiveSoakTape is deterministic', () => {
    const a = buildCompetitiveSoakTape(16)
    const b = buildCompetitiveSoakTape(16)
    expect(a).toEqual(b)
    expect(a[0].playerId).toBe('p1')
  })

  it('tickCompetitiveAuthority advances session tick', () => {
    const session = createFixedPointRollbackSession({
      seedBodies: [{ id: 'p1', y: 1 }],
    })
    const r0 = tickCompetitiveAuthority(session, [
      fixedInputFromAxes('p1', 0, 0, 1, 0),
    ])
    expect(r0.tick).toBe(1)
    const r1 = tickCompetitiveAuthority(session, [])
    expect(r1.tick).toBe(2)
    expect(r1.stateHash).not.toBe(r0.stateHash)
  })
})

describe('competitive rollback honesty (ce)', () => {
  it('prove + probe flip competitiveRollbackSoakReady; ggpoLive stays false', () => {
    expect(GGPO_LIVE_HELD).toBe(true)
    const proven = proveCompetitiveRollbackSoak(24)
    expect(proven.passed).toBe(true)

    const honesty = probeCompetitiveRollbackHonesty()
    expect(honesty.letter).toBe('ce')
    expect(honesty.competitiveRollbackSoakReady).toBe(true)
    expect(honesty.ggpoLive).toBe(false)
    expect(honesty.competitiveMarketingAllowed).toBe(false)

    const forcedOff = probeCompetitiveRollbackHonesty({ soakPassed: false })
    expect(forcedOff.competitiveRollbackSoakReady).toBe(false)
  })

  it('fixed-point honesty soak field does not flip ggpoLive', () => {
    const ready = evaluateFixedPointNetcodeHonesty({
      fixedPointPhysicsWired: true,
      competitiveSoakProven: true,
      ggpoSessionProven: true,
    })
    expect(ready.fixedPointNetcodeReady).toBe(true)
    expect(ready.competitiveRollbackSoakReady).toBe(true)
    expect(ready.ggpoLive).toBe(false)
  })
})

describe('aaa-production + competitive mode (ce)', () => {
  it('capability auto-proves competitiveRollbackSoakReady; ggpoLive false', () => {
    const cap = probeAaaProductionCapability()
    expect(cap.fixedPointNetcodeReady).toBe(true)
    expect(cap.competitiveRollbackSoakReady).toBe(true)
    expect(cap.ggpoLive).toBe(false)
    expect(cap.marketingAaaProductionAllowed).toBe(false)

    const forcedOff = probeAaaProductionCapability({
      competitiveRollbackSoakPassed: false,
    })
    expect(forcedOff.competitiveRollbackSoakReady).toBe(false)
    expect(forcedOff.fixedPointNetcodeReady).toBe(true)

    const report = evaluateAaaProductionHonesty()
    const gap6 = report.gaps.find((g) => g.id === 6)!
    expect(gap6.shipStatus).toBe('CLOSED')
    expect(gap6.notes.some((n) => n.includes('letter ce'))).toBe(true)
    expect(report.capability.ggpoLive).toBe(false)
  })

  it('competitiveRequested still resolves fixed-point-competitive without marketing', () => {
    const comp = resolvePhysicsAuthorityMode({ competitiveRequested: true })
    expect(comp.mode).toBe('fixed-point-competitive')
    expect(comp.ggpoLive).toBe(false)
    expect(comp.competitiveMarketingAllowed).toBe(false)
    expect(comp.uiVisible).toBe(false)
  })
})
