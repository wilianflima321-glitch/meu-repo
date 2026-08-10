/**
 * Letter cv — GPU-driven hierarchical fracture + debris (Entropy deepen).
 * DEST-001 convex + Rapier hero budget remain; Chaos parity HELD.
 */

export {
  HIERARCHICAL_VORONOI_LETTER,
  HIERARCHICAL_VORONOI_WIRED,
  buildHierarchicalVoronoiPlan,
  planEntriesToDebrisSoa,
  type FractureTier,
  type HierarchicalFragmentPlanEntry,
  type HierarchicalVoronoiPlan,
  type BuildHierarchicalVoronoiPlanInput,
} from '@/lib/destruction/hierarchical-voronoi-plan'

export {
  HERO_RAPIER_BUDGET_LETTER,
  resolveHeroRapierBudget,
  selectHeroFragmentsForRapier,
  type HeroRapierBudget,
} from '@/lib/destruction/hero-fragment-rapier-budget'

export {
  GPU_FRACTURE_LETTER,
  GPU_FRACTURE_WIRED,
  GPU_FRACTURE_MIN_CAPABILITY_SCORE,
  CHAOS_PARITY_READY,
  CHAOS_PARITY_HELD,
  CHAOS_PARITY_MARKETING_ALLOWED,
  GPU_FRACTURE_BIND_LAYOUT,
  planGpuFracture,
  buildGpuFractureComputePipelineDescriptor,
  dispatchGpuFractureDebris,
  integrateDebrisCpu,
  runGpuFractureComputeSoak,
  runFractureDebrisGpuOrCpu,
  fractureAndIntegrate,
  proveGpuFractureReady,
  recordGpuFractureSoak,
  getLastGpuFractureSoak,
  probeGpuFractureHonesty,
  createMockGpuFractureDevice,
  ensureGpuFractureSoak,
  configureGpuFractureContext,
  getGpuFractureContext,
  getEntropyFractureDebrisShaderSpec,
  type GpuFractureBackend,
  type GpuFracturePlan,
  type GpuFractureComputeSoakResult,
  type GpuFractureGpuDeviceLike,
  type IntegrateFractureDebrisResult,
} from '@/lib/destruction/gpu-fracture'

export {
  probeDestructionHonesty,
  type DestructionHonestyReport,
} from '@/lib/destruction/destruction-honesty'

export {
  CHAOS_DESTRUCTION_AAA_READY,
  UNREAL_CHAOS_PARITY_READY,
  CHAOS_DESTRUCTION_MARKETING_ALLOWED,
  buildChaosEvidenceFixture,
  runChaosDestructionEvidenceSoak,
  claimChaosDestructionAaa,
  claimUnrealChaosParity,
  probeChaosDestructionEvidenceReadiness,
  type ChaosDestructionEvidence,
} from '@/lib/destruction/chaos-destruction-evidence'
