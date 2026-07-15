/**
 * Letter cj — EQS → GAS playtest wire Vitest.
 */

import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createCharacterTopologyBus } from '@/lib/character/character-topology-bus'
import {
  evaluateAndFireWithEqs,
  proveEqsPlaytestSoak,
  runNpcEqsFireDecision,
  EQS_PLAYTEST_WIRE_LETTER,
  type EqsGasFireTickResult,
} from '@/lib/character/eqs-playtest-wire'
import {
  proveEqsPlaytestWire,
  probeEqsPlaytestHonesty,
  EQS_PLAYTEST_LETTER,
} from '@/lib/character/eqs-playtest-honesty'
import {
  createAabbLosTester,
  createBlockedLosTester,
  createOpenLosTester,
} from '@/lib/character/eqs-los-provider'
import type { EqsQueryInput } from '@/lib/character/environment-query-system'
import { EqsFireAbilityActionNode, EQS_BT_KEYS } from '@/lib/ai/behavior-tree-nodes'
import { BehaviorTree, AIAgent, Blackboard } from '@/lib/ai/behavior-tree-system'

describe('EQS playtest wire (cj)', () => {
  it('gates fire on LoS then predictFireball when clear', () => {
    const bus = createCharacterTopologyBus({ capabilityScore: 38 })
    const blocked = evaluateAndFireWithEqs(bus, 1, {
      kind: 'los-fire',
      agent: { x: 0, y: 0, z: 0 },
      target: { x: 10, y: 0, z: 0 },
      candidates: [
        { id: 'a', x: 2, y: 0, z: 2 },
        { id: 'b', x: 5, y: 0, z: 0 },
      ],
      hasLineOfSight: (from, to) => {
        const fx = 'x' in from ? from.x : 0
        const tx = 'x' in to ? to.x : 0
        if (Math.abs(fx) < 0.01 && Math.abs(tx - 10) < 0.01) return false
        return Math.abs(fx - 5) < 0.01
      },
    })
    expect(blocked.fired).toBe(false)
    expect(blocked.relocateTo?.id).toBe('b')

    const clear = bus.evaluateAndFireWithEqs(2, {
      kind: 'los-fire',
      agent: { x: 5, y: 0, z: 0 },
      target: { x: 10, y: 0, z: 0 },
      candidates: [],
      hasLineOfSight: createOpenLosTester(),
    })
    expect(clear.fired).toBe(true)
    expect(clear.activation?.abilityId).toBe('fireball')
    expect(clear.zeroUiUnavailable).toBe(false)
  })

  it('Zero-UI when topology bus unavailable', () => {
    const decision = runNpcEqsFireDecision({
      kind: 'los-fire',
      agent: { x: 0, y: 0, z: 0 },
      target: { x: 1, y: 0, z: 0 },
      candidates: [],
      hasLineOfSight: createOpenLosTester(),
    })
    expect(decision.gate.fireNow).toBe(true)
    const result = evaluateAndFireWithEqs(null, 1, {
      kind: 'los-fire',
      agent: { x: 0, y: 0, z: 0 },
      target: { x: 1, y: 0, z: 0 },
      candidates: [],
      hasLineOfSight: createOpenLosTester(),
    })
    expect(result.zeroUiUnavailable).toBe(true)
    expect(result.fired).toBe(false)
  })

  it('AABB LoS provider occludes mid-segment', () => {
    const los = createAabbLosTester([{ minX: 4, maxX: 6, minZ: -1, maxZ: 1 }])
    expect(los({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 })).toBe(false)
    expect(los({ x: 0, y: 0, z: 5 }, { x: 10, y: 0, z: 5 })).toBe(true)
    expect(createBlockedLosTester()({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(false)
  })

  it('soak + honesty eqsPlaytestReady; marketing HELD', () => {
    const wire = proveEqsPlaytestWire()
    expect(wire.passed).toBe(true)
    expect(wire.letter).toBe(EQS_PLAYTEST_LETTER)
    expect(wire.letter).toBe('cj')
    expect(wire.soak.clearFires).toBe(true)
    expect(wire.soak.blockedRelocates).toBe(true)

    const bus = createCharacterTopologyBus()
    const soak = proveEqsPlaytestSoak(bus)
    expect(soak.letter).toBe(EQS_PLAYTEST_WIRE_LETTER)
    expect(soak.passed).toBe(true)

    const honesty = probeEqsPlaytestHonesty()
    expect(honesty.eqsPlaytestReady).toBe(true)
    expect(honesty.eqsLibWired).toBe(true)
    expect(honesty.gasIpc60HzAllowed).toBe(false)
    expect(honesty.ueEqsParityAllowed).toBe(false)
    expect(honesty.zeroUiWhenUnavailable).toBe(true)
  })

  it('SimulationTick-style queue drain fires GAS (playtest hot path)', () => {
    // Mirrors SimulationTick.step EQS drain without Rapier wasm init.
    const bus = createCharacterTopologyBus({ capabilityScore: 38 })
    const pending: EqsQueryInput[] = []
    pending.push({
      kind: 'los-fire',
      agent: { x: 0, y: 0, z: 0 },
      target: { x: 8, y: 0, z: 0 },
      candidates: [],
      hasLineOfSight: createOpenLosTester(),
    })

    let eqsFiresResolved = 0
    let eqsAbilitiesFired = 0
    let eqsFrame = 0
    const queue = pending.splice(0, pending.length)
    for (const input of queue) {
      eqsFrame += 1
      const result: EqsGasFireTickResult = evaluateAndFireWithEqs(bus, eqsFrame, input)
      eqsFiresResolved += 1
      if (result.fired) eqsAbilitiesFired += 1
    }
    expect(eqsFiresResolved).toBe(1)
    expect(eqsAbilitiesFired).toBe(1)
    expect(pending.length).toBe(0)
  })

  it('BT EqsFireAbilityActionNode fires when LoS clear', () => {
    const bus = createCharacterTopologyBus({ capabilityScore: 38 })
    const agent = new AIAgent({
      id: 'npc-eqs',
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Quaternion(),
      speed: 3,
      sightRange: 20,
      sightAngle: Math.PI,
      hearingRange: 10,
      memoryDuration: 1,
    })
    const bb = new Blackboard()
    bb.set(EQS_BT_KEYS.topologyBus, bus)
    bb.set(EQS_BT_KEYS.target, { x: 5, y: 0, z: 0 })
    bb.set(EQS_BT_KEYS.candidates, [])
    bb.set(EQS_BT_KEYS.hasLineOfSight, createOpenLosTester())
    bb.set(EQS_BT_KEYS.frame, 7)
    const tree = new BehaviorTree(new EqsFireAbilityActionNode('eqs-fire'), bb)
    const status = tree.tick(agent, 1 / 60)
    expect(status).toBe('success')
    expect(agent.getState()).toBe('attacking')
    expect(bus.gasPrediction.state.pending.some((p) => p.abilityId === 'fireball')).toBe(true)
  })
})
