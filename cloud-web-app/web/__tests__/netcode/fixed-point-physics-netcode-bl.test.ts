/**
 * Letter bl — Fixed-point physics / netcode deepen (Zero-MVP honesty).
 * Determinism + rollback restore; GGPO-live / desync-free marketing HELD.
 */

import { describe, expect, it } from 'vitest'
import {
  evaluateFixedPointNetcodeHonesty,
  fixedClamp,
  fixedDeterminismHash,
  fixedMul,
  fixedSqrt,
  toFixed,
} from '@/lib/netcode/fixed-point'
import {
  createFixedPointPhysicsAdapter,
  probeFixedPointPhysicsWired,
} from '@/lib/netcode/fixed-point-physics-adapter'
import {
  createFixedPointRollbackSession,
  fixedInputFromAxes,
} from '@/lib/netcode/fixed-point-rollback-session'
import {
  competitiveModeUiOrNull,
  resolvePhysicsAuthorityMode,
} from '@/lib/netcode/competitive-sim-mode'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'

describe('fixed-point deepen math', () => {
  it('fixedSqrt and clamp are deterministic', () => {
    const a = fixedSqrt(toFixed(4))
    const b = fixedSqrt(toFixed(4))
    expect(a).toBe(b)
    expect(fixedDeterminismHash([a, fixedClamp(toFixed(3), toFixed(0), toFixed(2))])).toBe(
      fixedDeterminismHash([fixedSqrt(toFixed(4)), fixedClamp(toFixed(3), toFixed(0), toFixed(2))]),
    )
    expect(fixedMul(toFixed(1.5), toFixed(2))).toBe(toFixed(3))
  })
})

describe('FixedPointPhysicsAdapter determinism', () => {
  it('same seed bodies + same steps → identical state hash', () => {
    const run = () => {
      const sim = createFixedPointPhysicsAdapter({ gravityY: -9.81 })
      sim.spawn('p1', 0, 1, 0)
      for (let i = 0; i < 30; i++) {
        sim.applyInputs([
          fixedInputFromAxes('p1', i, i % 5 === 0 ? 1 : 0, 1, 0),
        ])
        sim.step()
      }
      return sim.stateHash()
    }
    expect(run()).toBe(run())
  })

  it('serialize/restore blob is bit-identical', () => {
    const a = createFixedPointPhysicsAdapter()
    a.spawn('a', 1, 2, 3)
    a.applyInputs([fixedInputFromAxes('a', 0, 0, 0.5, -0.25)])
    a.step()
    const blob = a.serializeStateBlob()
    const hash = a.stateHash()

    const b = createFixedPointPhysicsAdapter()
    b.restoreStateBlob(blob)
    expect(b.stateHash()).toBe(hash)
    b.step()
    a.step()
    expect(b.stateHash()).toBe(a.stateHash())
  })
})

describe('FixedPointRollbackSession restore', () => {
  it('rollback restore returns to prior checksum then resims', () => {
    const session = createFixedPointRollbackSession({
      seedBodies: [{ id: 'p1', x: 0, y: 1, z: 0 }],
      capacity: 32,
    })

    for (let i = 0; i < 10; i++) {
      session.tick([fixedInputFromAxes('p1', i, 0, 1, 0)])
    }
    const hashAt10 = session.stateHash()
    const slot5 = session.frames.getByTick(5)
    expect(slot5?.stateBlob).toBeTruthy()
    const checksum5 = slot5!.checksum

    for (let i = 10; i < 15; i++) {
      session.tick([fixedInputFromAxes('p1', i, 0, 0.5, 0)])
    }
    expect(session.stateHash()).not.toBe(hashAt10)

    expect(session.rollbackTo(5)).toBe(true)
    // After rollback+resim through stored frames, land at end of ring from tick 5
    expect(session.frames.getByTick(5)?.checksum).toBe(checksum5)

    // Two independent sessions with same tape match
    const s1 = createFixedPointRollbackSession({
      seedBodies: [{ id: 'p1', y: 1 }],
    })
    const s2 = createFixedPointRollbackSession({
      seedBodies: [{ id: 'p1', y: 1 }],
    })
    const tape = [0, 1, 0, 1, 0, 1, 0, 1].map((btn, i) =>
      fixedInputFromAxes('p1', i, btn, 0.75, -0.1),
    )
    for (const input of tape) {
      s1.tick([input])
      s2.tick([input])
    }
    expect(s1.stateHash()).toBe(s2.stateHash())

    // Late input correct + resim stays deterministic across peers
    const late = [fixedInputFromAxes('p1', 3, 1, -0.5, 0.2)]
    expect(s1.correctAndResimulate(3, late)).toBe(true)
    expect(s2.correctAndResimulate(3, late)).toBe(true)
    expect(s1.stateHash()).toBe(s2.stateHash())
  })
})

describe('competitive mode + honesty', () => {
  it('Rapier float default; competitive explicit; Zero-UI null', () => {
    const def = resolvePhysicsAuthorityMode()
    expect(def.mode).toBe('rapier-float')
    expect(def.ggpoLive).toBe(false)
    expect(def.competitiveMarketingAllowed).toBe(false)
    expect(def.uiVisible).toBe(false)
    expect(competitiveModeUiOrNull(def)).toBeNull()

    const comp = resolvePhysicsAuthorityMode({ competitiveRequested: true })
    expect(probeFixedPointPhysicsWired()).toBe(true)
    expect(comp.mode).toBe('fixed-point-competitive')
    expect(comp.fixedPointNetcodeReady).toBe(true)
    expect(comp.ggpoLive).toBe(false)
    expect(competitiveModeUiOrNull(comp)).toBeNull()
  })

  it('fixedPointNetcodeReady flips when path wired; ggpoLive stays false', () => {
    expect(evaluateFixedPointNetcodeHonesty().fixedPointNetcodeReady).toBe(false)
    expect(evaluateFixedPointNetcodeHonesty().competitiveRollbackSoakReady).toBe(false)
    const ready = evaluateFixedPointNetcodeHonesty({
      fixedPointPhysicsWired: true,
      competitiveSoakProven: true,
      ggpoSessionProven: true,
    })
    expect(ready.fixedPointNetcodeReady).toBe(true)
    expect(ready.competitiveRollbackSoakReady).toBe(true)
    expect(ready.ggpoLive).toBe(false)
    expect(ready.rapierFloatDefault).toBe(true)

    const cap = probeAaaProductionCapability()
    expect(cap.fixedPointNetcodeReady).toBe(true)
    expect(cap.competitiveRollbackSoakReady).toBe(true)
    expect(cap.ggpoLive).toBe(false)
    expect(cap.marketingAaaProductionAllowed).toBe(false)

    const forcedOff = probeAaaProductionCapability({ fixedPointPhysicsWired: false })
    expect(forcedOff.fixedPointNetcodeReady).toBe(false)
    expect(forcedOff.competitiveRollbackSoakReady).toBe(false)

    const report = evaluateAaaProductionHonesty()
    const gap6 = report.gaps.find((g) => g.id === 6)!
    expect(gap6.shipStatus).toBe('CLOSED')
    expect(report.capability.ggpoLive).toBe(false)
  })
})
