/**
 * Letter bu — Character / GAS topology deepen (Zero-MVP honesty).
 */

import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  planDualQuaternionSkinning,
  bonePoseToDualQuaternion,
  DUAL_QUATERNION_SKINNING_WIRED,
} from '@/lib/character/dual-quaternion-skinning'
import {
  tickBiologicalBridge,
  STUMBLE_MOTION_TAG,
  CHARACTER_BIOLOGICAL_BRIDGE_WIRED,
} from '@/lib/character/character-biological-bridge'
import {
  createGasClientPredictionSession,
  evaluateGasPredictionHonesty,
  GAS_CLIENT_PREDICTION_WIRED,
} from '@/lib/character/gas-client-prediction'
import {
  applyFootContactIk,
  createHeightfieldSampler,
  FOOT_CONTACT_IK_WIRED,
} from '@/lib/character/foot-contact-ik'
import {
  computeRetargetScaleFactors,
  retargetBipedPoseRuntime,
  RUNTIME_RETARGETING_WIRED,
} from '@/lib/character/runtime-retargeting'
import {
  runEnvironmentQuery,
  shouldFireAbilityAfterEqs,
  ENVIRONMENT_QUERY_SYSTEM_WIRED,
} from '@/lib/character/environment-query-system'
import {
  persistItemDataAsset,
  buildSwordFromCreatorDraft,
  DATA_ASSET_ITEM_PIPELINE_WIRED,
} from '@/lib/character/data-asset-item-pipeline'
import { probeCharacterTopologyHonesty, CHARACTER_TOPOLOGY_LETTER } from '@/lib/character/character-topology-honesty'
import { createFixedPointRollbackSession } from '@/lib/netcode/fixed-point-rollback-session'
import type { ActiveRagdollForceBody } from '@/lib/physics/active-ragdoll-apply'

describe('Character topology flags (bu)', () => {
  it('wires all topology modules', () => {
    expect(CHARACTER_TOPOLOGY_LETTER).toBe('bu')
    expect(DUAL_QUATERNION_SKINNING_WIRED).toBe(true)
    expect(CHARACTER_BIOLOGICAL_BRIDGE_WIRED).toBe(true)
    expect(GAS_CLIENT_PREDICTION_WIRED).toBe(true)
    expect(FOOT_CONTACT_IK_WIRED).toBe(true)
    expect(RUNTIME_RETARGETING_WIRED).toBe(true)
    expect(ENVIRONMENT_QUERY_SYSTEM_WIRED).toBe(true)
    expect(DATA_ASSET_ITEM_PIPELINE_WIRED).toBe(true)
  })
})

describe('GPU Dual Quaternion Skinning (bu)', () => {
  it('HELD honesty when WebGPU compute unavailable — WebGL2/CPU fallback', () => {
    const plan = planDualQuaternionSkinning({
      webgpuAvailable: false,
      webgpuComputeAvailable: false,
      bonePoses: [
        { boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 1, 0] },
        { boneIndex: 1, rotation: [0, 0.707, 0, 0.707], position: [0.5, 1, 0] },
      ],
    })
    expect(plan.gpuComputeSkinning).toBe(false)
    expect(plan.heldReason).toContain('HELD')
    expect(plan.dualQuaternions).toHaveLength(2)
    expect(plan.backend).toBe('cpu-fallback')
  })

  it('holds webgpu-compute until soak proven (bv gate)', () => {
    const plan = planDualQuaternionSkinning({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      bonePoses: [{ boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 0, 0] }],
    })
    expect(plan.gpuComputeSkinning).toBe(false)
    expect(plan.dqComputeSkinningReady).toBe(false)
    expect(plan.heldReason).toContain('HELD')
  })

  it('converts bone pose to dual quaternion', () => {
    const dq = bonePoseToDualQuaternion({
      boneIndex: 0,
      rotation: [0, 0, 0, 1],
      position: [2, 0, 0],
    })
    expect(dq.real[3]).toBeCloseTo(1)
    expect(Math.abs(dq.dual[0])).toBeGreaterThan(0)
  })
})

describe('Biological bridge GAS→Ragdoll→MM (bu)', () => {
  it('applies impulse and requests stumble search', () => {
    const impulses: Array<{ x: number; y: number; z: number }> = []
    const body: ActiveRagdollForceBody = {
      addForce(f) {
        impulses.push({ ...f })
      },
      addTorque() {},
    }
    const result = tickBiologicalBridge({
      impact: {
        abilityId: 'fireball',
        impulse: { x: 5, y: 0, z: 0 },
        clientVfxPlayed: true,
      },
      segments: [
        {
          id: 'spine',
          body,
          angleError: { x: 0, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
        },
      ],
      rootBody: body,
      rapierSubstrateReady: true,
      capabilityScore: 40,
      searchStumbleClips: (req) => {
        expect(req.tags).toContain(STUMBLE_MOTION_TAG)
        return { clipId: 'stumble_forward', distance: 0.1 }
      },
    })
    expect(result.impulseApplied).toBe(true)
    expect(result.stumbleHit?.clipId).toBe('stumble_forward')
    expect(result.ragdoll.canClaimEuphoriaParity).toBe(false)
    expect(impulses.length).toBeGreaterThan(0)
  })
})

describe('GAS client prediction (bu)', () => {
  it('predicts mana/VFX instantly and reconciles server reject with rollback', () => {
    const session = createGasClientPredictionSession(50)
    const rollback = createFixedPointRollbackSession({ seedBodies: [{ id: 'p1' }] })
    rollback.tick([])
    rollback.tick([])
    session.bindRollbackSession(rollback)

    const pred = session.predictActivate({
      abilityId: 'fireball',
      frame: 1,
      manaCost: 15,
      vfxCueId: 'vfx.fireball.cast',
    })
    expect(pred).not.toBeNull()
    expect(session.state.mana).toBe(35)
    expect(session.state.rttHiddenActivations).toBe(1)

    const rejected = session.applyServerValidation({
      predictionId: pred!.predictionId,
      accepted: false,
      damageConfirmed: 0,
      manaConfirmed: 0,
      reason: 'server-deny',
    })
    expect(rejected.rollbackSuggested).toBe(true)
    expect(session.state.mana).toBe(50)

    const honesty = evaluateGasPredictionHonesty({
      sessionWired: true,
      rollbackSessionBound: true,
      activationsPredicted: 1,
    })
    expect(honesty.ggpoLiveMarketingAllowed).toBe(false)
    expect(honesty.gasPredictionReady).toBe(true)
  })
})

describe('Foot contact IK (bu)', () => {
  it('adjusts ankles from heightfield sampler', () => {
    const heights = new Float32Array([0, 0.2, 0, 0.2])
    const sample = createHeightfieldSampler({
      heights,
      resolution: 2,
      worldSize: 10,
      originX: -5,
      originZ: -5,
    })
    const bones = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>()
    for (const name of ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot']) {
      bones.set(name, {
        position: new THREE.Vector3(name.includes('Left') ? -0.1 : 0.1, name.includes('Foot') ? 0 : name.includes('Leg') && !name.includes('Up') ? 0.45 : 0.9, 0),
        rotation: new THREE.Quaternion(),
      })
    }
    const result = applyFootContactIk({
      boneTransforms: bones,
      left: { root: 'LeftUpLeg', mid: 'LeftLeg', end: 'LeftFoot' },
      right: { root: 'RightUpLeg', mid: 'RightLeg', end: 'RightFoot' },
      sampleHeight: sample,
    })
    expect(result.mode).toBe('two_bone_heightfield')
    expect(result.applied).toBe(true)
  })
})

describe('Runtime retargeting (bu)', () => {
  it('stretches biped pose across skeleton scale', () => {
    const scales = computeRetargetScaleFactors(
      { hipToHead: 0.7, hipHeight: 1.0, armSpan: 1.6 },
      { hipToHead: 0.9, hipHeight: 1.2, armSpan: 1.9 },
    )
    expect(scales.heightScale).toBeCloseTo(0.9 / 0.7, 5)
    const mapped = retargetBipedPoseRuntime(
      [{ boneName: 'Hips', position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }],
      new Map([['Hips', 'Hips']]),
      scales,
    )
    expect(mapped[0].position.y).toBeCloseTo(1 * scales.rootScale, 5)
  })
})

describe('EQS (bu)', () => {
  it('gates fire ability on LoS and suggests relocate', () => {
    const result = runEnvironmentQuery({
      kind: 'los-fire',
      agent: { x: 0, y: 0, z: 0 },
      target: { x: 10, y: 0, z: 0 },
      candidates: [
        { id: 'a', x: 2, y: 0, z: 2, coverBias: 0.2 },
        { id: 'b', x: 5, y: 0, z: 0, coverBias: 0.1 },
      ],
      hasLineOfSight: (from, to) => {
        const fx = 'x' in from ? from.x : 0
        const tx = 'x' in to ? to.x : 0
        // Block LoS from origin; allow from candidate b
        if (Math.abs(fx) < 0.01 && Math.abs(tx - 10) < 0.01) return false
        return Math.abs(fx - 5) < 0.01
      },
    })
    expect(result.canFireNow).toBe(false)
    const gate = shouldFireAbilityAfterEqs(result)
    expect(gate.fireNow).toBe(false)
    expect(gate.relocateTo?.id).toBe('b')
  })
})

describe('Data-Asset item pipeline (bu)', () => {
  it('persists sword via AssetPipeline not JSON-only primary', () => {
    const item = buildSwordFromCreatorDraft({
      id: `test-sword-${Date.now()}`,
      name: 'Test Blade',
      description: 'vitest',
      rarity: 'rare',
      damage: 20,
      weight: 2,
    })
    expect(item.type).toBe('weapon')
    expect(item.stats?.damage).toBe(20)

    const persisted = persistItemDataAsset({
      id: item.id,
      name: item.name,
      description: item.description,
      rarity: 'rare',
      damage: 20,
      weight: 2,
    })
    expect(persisted.ok).toBe(true)
    expect(persisted.assetPipelinePersisted).toBe(true)
    expect(persisted.path).toContain('data-assets/items/')
  })
})

describe('Character topology honesty aggregate (bu)', () => {
  it('reports HELD GPU compute when unavailable; no GGPO marketing', () => {
    const probe = probeCharacterTopologyHonesty({
      webgpuComputeAvailable: false,
      gasActivationsPredicted: 1,
      rollbackBound: true,
    })
    expect(probe.dualQuaternionSkinning.held).toBe(true)
    expect(probe.gasClientPrediction.ggpoLiveMarketingAllowed).toBe(false)
    expect(probe.eqs.wired).toBe(true)
    expect(probe.dataAssetIde.wired).toBe(true)
  })
})
