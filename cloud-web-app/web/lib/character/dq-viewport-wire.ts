/**
 * Letter bv — Viewport / AAARenderer hook for DQ compute skinning.
 * Participates when WebGPU present; never claims Nanite/Euphoria AAA.
 */

import {
  planDualQuaternionSkinning,
  runDualQuaternionComputeSoak,
  type BonePoseSample,
  type DualQuaternionComputeSoakResult,
  type DualQuaternionGpuDeviceLike,
  type DualQuaternionSkinPlan,
  DQ_COMPUTE_SKINNING_LETTER,
} from '@/lib/character/dual-quaternion-skinning'

export const DQ_VIEWPORT_WIRE_LETTER = DQ_COMPUTE_SKINNING_LETTER
export const DQ_VIEWPORT_WIRE_WIRED = true as const

export interface DualQuaternionViewportWireOptions {
  capabilityScore?: number
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  device?: DualQuaternionGpuDeviceLike | null
}

export interface DualQuaternionViewportTickResult {
  plan: DualQuaternionSkinPlan
  framesWithCompute: number
  /** Always false. */
  aaaSkinningMarketingAllowed: false
}

/**
 * Lazy viewport wire — soak once when device+compute present, then tick plans.
 */
export class DualQuaternionViewportWire {
  private capabilityScore: number
  private webgpuAvailable: boolean
  private webgpuComputeAvailable: boolean
  private device: DualQuaternionGpuDeviceLike | null
  private soak: DualQuaternionComputeSoakResult | null = null
  private framesWithCompute = 0
  private lastPlan: DualQuaternionSkinPlan | null = null

  constructor(opts: DualQuaternionViewportWireOptions = {}) {
    this.capabilityScore = opts.capabilityScore ?? 38
    this.webgpuAvailable = opts.webgpuAvailable === true
    this.webgpuComputeAvailable = opts.webgpuComputeAvailable === true
    this.device = opts.device ?? null
  }

  setCapabilityScore(score: number): void {
    this.capabilityScore = score
  }

  setWebGpu(available: boolean, computeAvailable: boolean, device?: DualQuaternionGpuDeviceLike | null): void {
    this.webgpuAvailable = available
    this.webgpuComputeAvailable = computeAvailable
    if (device !== undefined) this.device = device
  }

  /**
   * Prove compute path (or HELD). Call once when adapter becomes available.
   */
  ensureSoak(frames = 32): DualQuaternionComputeSoakResult {
    if (this.soak?.passed) return this.soak
    this.soak = runDualQuaternionComputeSoak({
      frames,
      webgpuAvailable: this.webgpuAvailable,
      webgpuComputeAvailable: this.webgpuComputeAvailable,
      capabilityScore: this.capabilityScore,
      device: this.device,
    })
    return this.soak
  }

  tick(bonePoses: BonePoseSample[]): DualQuaternionViewportTickResult {
    if (this.webgpuAvailable && this.webgpuComputeAvailable && this.device && !this.soak) {
      this.ensureSoak()
    }
    const plan = planDualQuaternionSkinning({
      webgpuAvailable: this.webgpuAvailable,
      webgpuComputeAvailable: this.webgpuComputeAvailable,
      bonePoses,
      capabilityScore: this.capabilityScore,
      soakPassed: this.soak?.passed === true,
      soakFramesProven: this.soak?.frames,
    })
    this.lastPlan = plan
    if (plan.dqComputeSkinningReady) {
      this.framesWithCompute += 1
    }
    return {
      plan,
      framesWithCompute: this.framesWithCompute,
      aaaSkinningMarketingAllowed: false,
    }
  }

  getLastPlan(): DualQuaternionSkinPlan | null {
    return this.lastPlan
  }

  getSoak(): DualQuaternionComputeSoakResult | null {
    return this.soak
  }

  getFramesWithCompute(): number {
    return this.framesWithCompute
  }

  dispose(): void {
    this.soak = null
    this.lastPlan = null
    this.framesWithCompute = 0
    this.device = null
  }
}

export function createDualQuaternionViewportWire(
  opts?: DualQuaternionViewportWireOptions,
): DualQuaternionViewportWire {
  return new DualQuaternionViewportWire(opts)
}
