/**
 * Letter bu/bv/cj — Optional character topology bus for SimulationTick.
 * GAS / ragdoll / MM / foot IK / EQS + DQ compute skin soak participate without drawing.
 * Letter cj — EQS→GAS playtest fire path via evaluateAndFireWithEqs.
 */

import {
  tickBiologicalBridge,
  type BiologicalBridgeTickInput,
  type BiologicalBridgeTickResult,
} from '@/lib/character/character-biological-bridge'
import {
  createGasClientPredictionSession,
  type GasClientPredictionSession,
} from '@/lib/character/gas-client-prediction'
import {
  planDualQuaternionSkinning,
  runDualQuaternionComputeSoak,
  motionMatchingBonesToPoseSamples,
  type BonePoseSample,
  type DualQuaternionComputeSoakResult,
  type DualQuaternionSkinPlan,
  type DualQuaternionGpuDeviceLike,
} from '@/lib/character/dual-quaternion-skinning'
import {
  evaluateAndFireWithEqs as runEqsGasFire,
  type EqsGasFireTickResult,
} from '@/lib/character/eqs-playtest-wire'
import type { EqsQueryInput } from '@/lib/character/environment-query-system'
import type { FixedPointRollbackSession } from '@/lib/netcode/fixed-point-rollback-session'

export const CHARACTER_TOPOLOGY_BUS_WIRED = true as const

export interface CharacterTopologyBusOptions {
  capabilityScore?: number
  rollbackSession?: FixedPointRollbackSession | null
  /** Optional WebGPU device (or mock) for DQ compute soak. */
  dqGpuDevice?: DualQuaternionGpuDeviceLike | null
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
}

export class CharacterTopologyBus {
  readonly gasPrediction: GasClientPredictionSession
  private capabilityScore: number
  private lastBridge: BiologicalBridgeTickResult | null = null
  private lastDqPlan: DualQuaternionSkinPlan | null = null
  private lastDqSoak: DualQuaternionComputeSoakResult | null = null
  private dqGpuDevice: DualQuaternionGpuDeviceLike | null
  private webgpuAvailable: boolean
  private webgpuComputeAvailable: boolean
  private dqFramesWithDispatch = 0

  constructor(options: CharacterTopologyBusOptions = {}) {
    this.capabilityScore = options.capabilityScore ?? 38
    this.gasPrediction = createGasClientPredictionSession(50)
    this.dqGpuDevice = options.dqGpuDevice ?? null
    this.webgpuAvailable = options.webgpuAvailable === true
    this.webgpuComputeAvailable = options.webgpuComputeAvailable === true
    if (options.rollbackSession) {
      this.gasPrediction.bindRollbackSession(options.rollbackSession)
    }
  }

  setCapabilityScore(score: number): void {
    this.capabilityScore = score
  }

  setWebGpuFlags(available: boolean, computeAvailable: boolean): void {
    this.webgpuAvailable = available
    this.webgpuComputeAvailable = computeAvailable
  }

  setDqGpuDevice(device: DualQuaternionGpuDeviceLike | null): void {
    this.dqGpuDevice = device
  }

  bindRollbackSession(session: FixedPointRollbackSession | null): void {
    this.gasPrediction.bindRollbackSession(session)
  }

  /**
   * Predict fireball instantly (VFX/mana), then biological impact tick when impulse ready.
   */
  predictFireball(frame: number): ReturnType<GasClientPredictionSession['predictActivate']> {
    return this.gasPrediction.predictActivate({
      abilityId: 'fireball',
      frame,
      manaCost: 15,
      vfxCueId: 'vfx.fireball.cast',
    })
  }

  /**
   * Letter cj — EQS cover/LoS gate then conditional GAS fire (playtest/sim path).
   */
  evaluateAndFireWithEqs(frame: number, input: EqsQueryInput): EqsGasFireTickResult {
    return runEqsGasFire(this, frame, input)
  }

  tickBridge(input: Omit<BiologicalBridgeTickInput, 'capabilityScore'>): BiologicalBridgeTickResult {
    this.lastBridge = tickBiologicalBridge({
      ...input,
      capabilityScore: this.capabilityScore,
    })
    return this.lastBridge
  }

  getLastBridge(): BiologicalBridgeTickResult | null {
    return this.lastBridge
  }

  /**
   * Letter bv — plan DQ skin from Motion Matching bone map (SOA order).
   */
  planDqFromMotionMatching(
    boneNames: string[],
    boneTransforms: Map<
      string,
      { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } }
    >,
  ): DualQuaternionSkinPlan {
    const poses = motionMatchingBonesToPoseSamples(boneNames, boneTransforms)
    return this.planDqSkinning(poses)
  }

  planDqSkinning(bonePoses: BonePoseSample[]): DualQuaternionSkinPlan {
    this.lastDqPlan = planDualQuaternionSkinning({
      webgpuAvailable: this.webgpuAvailable,
      webgpuComputeAvailable: this.webgpuComputeAvailable,
      bonePoses,
      capabilityScore: this.capabilityScore,
      soakPassed: this.lastDqSoak?.passed === true,
      soakFramesProven: this.lastDqSoak?.frames ?? this.dqFramesWithDispatch,
    })
    return this.lastDqPlan
  }

  /**
   * Run compute soak when device present; otherwise honest HELD result.
   */
  runDqComputeSoak(frames = 32): DualQuaternionComputeSoakResult {
    this.lastDqSoak = runDualQuaternionComputeSoak({
      frames,
      webgpuAvailable: this.webgpuAvailable,
      webgpuComputeAvailable: this.webgpuComputeAvailable,
      capabilityScore: this.capabilityScore,
      device: this.dqGpuDevice,
    })
    if (this.lastDqSoak.passed) {
      this.dqFramesWithDispatch = this.lastDqSoak.dispatches
    }
    return this.lastDqSoak
  }

  /**
   * Viewport/frame hook — increments proven dispatch frames when compute ready path ticks.
   */
  tickDqViewportFrame(bonePoses: BonePoseSample[]): DualQuaternionSkinPlan {
    const plan = this.planDqSkinning(bonePoses)
    if (plan.dqComputeSkinningReady) {
      this.dqFramesWithDispatch += 1
    }
    return plan
  }

  getLastDqPlan(): DualQuaternionSkinPlan | null {
    return this.lastDqPlan
  }

  getLastDqSoak(): DualQuaternionComputeSoakResult | null {
    return this.lastDqSoak
  }

  getDqFramesWithDispatch(): number {
    return this.dqFramesWithDispatch
  }

  isDqComputeSkinningReady(): boolean {
    return this.lastDqPlan?.dqComputeSkinningReady === true || this.lastDqSoak?.dqComputeSkinningReady === true
  }
}

export function createCharacterTopologyBus(
  options?: CharacterTopologyBusOptions,
): CharacterTopologyBus {
  return new CharacterTopologyBus(options)
}
