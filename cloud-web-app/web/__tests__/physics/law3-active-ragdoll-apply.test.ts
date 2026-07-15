/**
 * Law III Active Ragdoll muscle/balance apply CORE (letter bb).
 * Real PD + balance forces through stub PhysicsBody substrate; ambient classic no-op;
 * GT730 / Capability Score honesty; CSI independent.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  buildAmbientPhysicsPort,
  buildClassicAmbientPhysicsPort,
  createAethelAmbientApi,
  createGameplayHeuristicEmotionProvider,
  resetAethelAmbientApiForTests,
  resetAmbientMoALiveWireForTests,
  resetAmbientPhysicsLiveWireForTests,
  subscribeAmbientEmotionForPhysics,
  type AmbientPhysicsPort,
} from '@/lib/ambient'
import {
  ActiveRagdollController,
  applyActiveRagdollTick,
  computeBalanceCorrectionForce,
  computeMusclePdTorque,
  evaluateActiveRagdollHonesty,
  mapPostureHintToMuscleBias,
  muscleBudgetScaleFromCapabilityScore,
  resolveActiveRagdollHeld,
  stampAmbientPhysicsPortWithApplyHonesty,
  type ActiveRagdollForceBody,
  type ActiveRagdollVec3,
} from '@/lib/physics/active-ragdoll-apply'

function createStubBody() {
  const forces: ActiveRagdollVec3[] = []
  const torques: ActiveRagdollVec3[] = []
  const body: ActiveRagdollForceBody = {
    addForce(force) {
      forces.push({ ...force })
    },
    addTorque(torque) {
      torques.push({ ...torque })
    },
  }
  return { body, forces, torques }
}

describe('Active Ragdoll muscle PD + balance helpers', () => {
  it('computeMusclePdTorque is real PD (k·e − d·ω)', () => {
    const torque = computeMusclePdTorque({
      angleError: { x: 0.5, y: 0, z: 0 },
      angularVelocity: { x: 1, y: 0, z: 0 },
      stiffness: 40,
      damping: 8,
    })
    expect(torque.x).toBeCloseTo(40 * 0.5 - 8 * 1, 6)
    expect(torque.y).toBe(0)
    expect(torque.z).toBe(0)
  })

  it('computeBalanceCorrectionForce restores horizontal CoM toward support', () => {
    const force = computeBalanceCorrectionForce({
      com: { x: 0.4, y: 1.0, z: 0 },
      supportPoint: { x: 0, y: 0, z: 0 },
      comVelocity: { x: 0.1, y: 0, z: 0 },
      stiffness: 50,
      damping: 5,
      marginScale: 1,
    })
    expect(force.x).toBeLessThan(0)
    expect(force.y).toBeCloseTo(0, 6)
    expect(force.z).toBeCloseTo(0, 6)
  })

  it('mapPostureHintToMuscleBias: classic/noop is identity (ambient no-op path)', () => {
    expect(mapPostureHintToMuscleBias('classic').applied).toBe(false)
    expect(mapPostureHintToMuscleBias('tense', true).applied).toBe(false)
    expect(mapPostureHintToMuscleBias(undefined).applied).toBe(false)

    const flinch = mapPostureHintToMuscleBias('flinch_ready')
    expect(flinch.applied).toBe(true)
    expect(flinch.tensionScale).toBeGreaterThan(1)
    expect(flinch.flinchBias).toBeGreaterThan(0)

    const relaxed = mapPostureHintToMuscleBias('relaxed')
    expect(relaxed.tensionScale).toBeLessThan(1)
    expect(relaxed.balanceMarginScale).toBeGreaterThan(1)
  })
})

describe('Active Ragdoll honesty + Capability Score (GT730)', () => {
  it('held until Rapier substrate + apply path are real', () => {
    const held = evaluateActiveRagdollHonesty({
      rapierSubstrateReady: false,
      applyPathEnabled: true,
    })
    expect(held.activeRagdollHeld).toBe(true)
    expect(held.shipStatus).toBe('HELD')
    expect(held.canClaimEuphoriaParity).toBe(false)

    const ready = evaluateActiveRagdollHonesty({
      rapierSubstrateReady: true,
      applyPathEnabled: true,
      capabilityScore: 18,
    })
    expect(ready.activeRagdollHeld).toBe(false)
    expect(ready.shipStatus).toBe('SHIPPED')
    expect(ready.canClaimEuphoriaParity).toBe(false)
    expect(ready.muscleBudgetScale).toBe(0.35)
    expect(ready.euphoriaParityStatus).toBe('HELD')
    expect(resolveActiveRagdollHeld({ rapierSubstrateReady: true, applyPathEnabled: true })).toBe(
      false,
    )
  })

  it('muscleBudgetScaleFromCapabilityScore is GT730-honest', () => {
    expect(muscleBudgetScaleFromCapabilityScore(12)).toBe(0.35)
    expect(muscleBudgetScaleFromCapabilityScore(30)).toBe(0.55)
    expect(muscleBudgetScaleFromCapabilityScore(50)).toBe(0.75)
    expect(muscleBudgetScaleFromCapabilityScore(90)).toBe(1)
  })

  it('stampAmbientPhysicsPortWithApplyHonesty flips activeRagdollHeld; CSI untouched', () => {
    const classic = buildClassicAmbientPhysicsPort()
    expect(classic.activeRagdollHeld).toBe(true)
    expect(classic.autoApplyForces).toBe(false)
    expect(classic.physiologyHeld).toBe(true)

    const honesty = evaluateActiveRagdollHonesty({
      rapierSubstrateReady: true,
      applyPathEnabled: true,
    })
    const stamped = stampAmbientPhysicsPortWithApplyHonesty(classic, honesty)
    expect(stamped.activeRagdollHeld).toBe(false)
    expect(stamped.autoApplyForces).toBe(false)
    expect(stamped.physiologyHeld).toBe(true)
  })
})

describe('Active Ragdoll apply tick through force substrate', () => {
  it('applies PD torque + balance force when substrate ready', () => {
    const { body, forces, torques } = createStubBody()
    const result = applyActiveRagdollTick({
      segments: [
        {
          id: 'pelvis',
          body,
          angleError: { x: 0.2, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
        },
      ],
      balance: {
        com: { x: 0.3, y: 1, z: 0 },
        supportPoint: { x: 0, y: 0, z: 0 },
        comVelocity: { x: 0, y: 0, z: 0 },
        stiffness: 40,
        damping: 4,
        marginScale: 1,
      },
      postureHint: 'tense',
      ambientNoop: false,
      rapierSubstrateReady: true,
      applyEnabled: true,
      capabilityScore: 50,
    })

    expect(result.applied).toBe(true)
    expect(result.activeRagdollHeld).toBe(false)
    expect(result.canClaimEuphoriaParity).toBe(false)
    expect(result.ambientBiasApplied).toBe(true)
    expect(torques.length).toBe(1)
    expect(torques[0].x).not.toBe(0)
    expect(forces.length).toBe(1)
    expect(forces[0].x).toBeLessThan(0)
    expect(result.balanceForce).not.toBeNull()
  })

  it('ambient classic/noop: no posture bias but muscle still applies when ready', () => {
    const { body, torques } = createStubBody()
    const result = applyActiveRagdollTick({
      segments: [
        {
          id: 'spine',
          body,
          angleError: { x: 0.1, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
        },
      ],
      postureHint: 'flinch_ready',
      ambientNoop: true,
      rapierSubstrateReady: true,
      applyEnabled: true,
    })
    expect(result.applied).toBe(true)
    expect(result.ambientBiasApplied).toBe(false)
    expect(torques.length).toBe(1)
  })

  it('no-op when substrate missing (held path)', () => {
    const { body, torques, forces } = createStubBody()
    const result = applyActiveRagdollTick({
      segments: [
        {
          id: 'pelvis',
          body,
          angleError: { x: 1, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
        },
      ],
      rapierSubstrateReady: false,
      applyEnabled: true,
    })
    expect(result.applied).toBe(false)
    expect(result.activeRagdollHeld).toBe(true)
    expect(torques.length).toBe(0)
    expect(forces.length).toBe(0)
  })
})

describe('ActiveRagdollController ambient consumer', () => {
  it('setPostureFromAmbient applies enhancement hints; classic clears bias', () => {
    const controller = new ActiveRagdollController({
      rapierSubstrateReady: true,
      applyEnabled: true,
      capabilityScore: 40,
    })
    expect(controller.honesty().activeRagdollHeld).toBe(false)

    const enhanced = buildAmbientPhysicsPort(
      {
        label: 'panicked',
        confidence: 0.9,
        source: 'gameplay_heuristic',
        heartRateHeld: true,
        breathRateHeld: true,
        emittedAtMs: 1,
      },
      { enhancementActive: true, activeRagdollHeld: false },
    )
    controller.setPostureFromAmbient(enhanced)

    const { body, torques } = createStubBody()
    const flinchTick = controller.tick([
      {
        id: 'torso',
        body,
        angleError: { x: 0.05, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
      },
    ])
    expect(flinchTick.ambientBiasApplied).toBe(true)
    expect(torques[0].x).toBeGreaterThan(0)

    controller.setPostureFromAmbient(buildClassicAmbientPhysicsPort({ activeRagdollHeld: false }))
    const { body: body2, torques: torques2 } = createStubBody()
    const classicTick = controller.tick([
      {
        id: 'torso',
        body: body2,
        angleError: { x: 0.05, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
      },
    ])
    expect(classicTick.ambientBiasApplied).toBe(false)
    expect(torques2.length).toBe(1)
  })
})

describe('Ambient physics subscribe + Law III honesty stamp (bb)', () => {
  beforeEach(() => {
    resetAethelAmbientApiForTests()
    resetAmbientMoALiveWireForTests()
    resetAmbientPhysicsLiveWireForTests()
  })

  it('default subscribe still reports activeRagdollHeld until stamped ready', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'ethernet' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const ports: AmbientPhysicsPort[] = []
    const sub = subscribeAmbientEmotionForPhysics({
      api,
      enhancementActive: true,
      onPhysicsHint: ({ physicsPort }) => ports.push(physicsPort),
    })
    api.ingestGameplayHeuristic({ damageIntensity: 0.5, nowMs: 10 })
    expect(ports[0].activeRagdollHeld).toBe(true)
    expect(ports[0].autoApplyForces).toBe(false)
    expect(ports[0].physiologyHeld).toBe(true)
    sub.stop()
  })

  it('subscribe can stamp ready when apply honesty flips', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'none' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const held = resolveActiveRagdollHeld({
      rapierSubstrateReady: true,
      applyPathEnabled: true,
    })
    expect(held).toBe(false)

    const ports: AmbientPhysicsPort[] = []
    const sub = subscribeAmbientEmotionForPhysics({
      api,
      enhancementActive: true,
      activeRagdollHeld: held,
      onPhysicsHint: ({ physicsPort }) => ports.push(physicsPort),
    })
    api.ingestGameplayHeuristic({ damageIntensity: 0.2, nowMs: 20 })
    expect(ports[0].activeRagdollHeld).toBe(false)
    expect(ports[0].noop).toBe(false)
    expect(ports[0].autoApplyForces).toBe(false)
    sub.stop()
  })

  it('classic ambient path remains Zero-UI no-op (no posture bias required)', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'ethernet' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const ports: AmbientPhysicsPort[] = []
    const sub = subscribeAmbientEmotionForPhysics({
      api,
      onPhysicsHint: ({ physicsPort }) => ports.push(physicsPort),
    })
    api.ingestGameplayHeuristic({ damageIntensity: 0.9, nowMs: 30 })
    expect(ports[0].noop).toBe(true)
    expect(ports[0].postureHint).toBe('classic')
    expect(mapPostureHintToMuscleBias(ports[0].postureHint, ports[0].noop).applied).toBe(false)
    sub.stop()
  })
})
