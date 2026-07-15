/**
 * Letter cw — GPU Mass Entity Component System (crowds as data matrices).
 * Unreal Mass / 100k claim HELD until Founder-scale soak.
 */

export {
  MASS_SOA_LETTER,
  MASS_SOA_WIRED,
  MASS_POS_STRIDE,
  MASS_VEL_STRIDE,
  MASS_STATE_STRIDE,
  createMassAgentSoaBuffers,
  spawnMassAgents,
  fillSyntheticMassCrowd,
  type MassAgentSoaBuffers,
} from '@/lib/mass-ecs/mass-soa-buffers'

export {
  uploadNearbyLodAgents,
  type MassLodCamera,
  type MassLodUploadResult,
} from '@/lib/mass-ecs/mass-lod-upload'

export {
  GPU_MASS_ECS_LETTER,
  GPU_MASS_ECS_WIRED,
  GPU_MASS_ECS_MIN_CAPABILITY_SCORE,
  MASS_100K_CLAIM_READY,
  MASS_100K_CLAIM_HELD,
  UNREAL_MASS_PARITY_READY,
  UNREAL_MASS_PARITY_HELD,
  GPU_MASS_ECS_BIND_LAYOUT,
  planGpuMassEcs,
  buildGpuMassEcsComputePipelineDescriptor,
  stepMassAgentsCpu,
  dispatchGpuMassEcsStep,
  runGpuMassEcsComputeSoak,
  stepMassEcsGpuOrCpu,
  proveGpuMassEcsReady,
  recordGpuMassEcsSoak,
  getLastGpuMassEcsSoak,
  probeGpuMassEcsHonesty,
  createMockGpuMassEcsDevice,
  ensureGpuMassEcsSoak,
  configureGpuMassEcsContext,
  getGpuMassEcsContext,
  getMassEcsAgentStepShaderSpec,
  type GpuMassEcsBackend,
  type GpuMassEcsPlan,
  type GpuMassEcsComputeSoakResult,
  type GpuMassEcsGpuDeviceLike,
} from '@/lib/mass-ecs/gpu-mass-step'

export {
  probeMassEcsHonesty,
  type MassEcsHonestyReport,
} from '@/lib/mass-ecs/mass-ecs-honesty'
