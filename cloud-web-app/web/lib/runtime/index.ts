/**
 * Runtime scaffolds — editor≠runtime, SAB transforms, object pool, frame arena.
 */

export {
  isEditorSurface,
  evaluateEditorRuntimeBoundary,
  assertPublishedBundleStripsEditor,
  assertRuntimeExportClean,
  findDeniedIdePathMarkers,
  proveRuntimeExportCleanGate,
  EDITOR_RUNTIME_BOUNDARY_WIRED,
  IDE_RUNTIME_DENY_PATH_MARKERS,
  type EditorRuntimeBoundaryReport,
  type RuntimeExportCleanReport,
  type RuntimeSurfaceKind,
} from './editor-runtime-boundary'

export {
  proveEditorRuntimeIsolation,
  probeEditorRuntimeBoundaryWired,
  probeEditorRuntimeHonesty,
  type EditorRuntimeHonesty,
} from './editor-runtime-honesty'

export {
  SHARED_TRANSFORM_LAYOUT_VERSION,
  TRANSFORM_STRIDE_BYTES,
  describeSharedTransformLayout,
  sharedTransformAtomicsProtocol,
  tryCreateSharedTransformBuffer,
  writeTransformSlot,
  publishTransformEpoch,
  probeSabTransformHonesty,
  type SharedTransformBufferLayout,
  type SabTransformHonesty,
} from './shared-transform-buffer'

export {
  COOP_COEP_HEADERS_CONFIGURED,
  getCoopCoepHeaderPairs,
  pathNeedsCoopCoep,
  evaluateCoopCoepHeadersHonesty,
  COOP_VALUE,
  COEP_VALUE,
} from './coop-coep-headers'

export {
  SAB_PHYSICS_BRIDGE_WIRED,
  SharedTransformPhysicsBridge,
  createSharedTransformPhysicsBridge,
  probeSharedTransformBridgeHonesty,
  type SharedTransformBridgeMode,
  type TransformPose,
} from './shared-transform-physics-bridge'

export {
  PHYSICS_WORKER_PROTOCOL_VERSION,
  PhysicsWorkerSimState,
  handlePhysicsWorkerRequest,
  isPhysicsWorkerRequest,
  type PhysicsWorkerRequest,
  type PhysicsWorkerResponse,
  type PhysicsWorkerBodySeed,
} from './physics-worker-protocol'

export {
  PHYSICS_WORKER_PATH_WIRED,
  probePhysicsWorkerWired,
  probePhysicsWorkerHonesty,
  type PhysicsWorkerHonesty,
} from './physics-worker-honesty'

export {
  PhysicsWorkerManager,
  createPhysicsWorkerManager,
  getBridgeUnderlyingBuffer,
  type PhysicsWorkerManagerMode,
  type PhysicsWorkerStepResult,
} from './physics-worker-manager'

export { ObjectPool, type ObjectPoolStats, type ObjectPoolOptions } from './object-pool'

export {
  FrameArena,
  GAMEPLAY_HOT_PATH_RULES,
  gameplayHotPathRuleSummary,
  assertNoHotPathAlloc,
  type FrameArenaStats,
  type HotPathAllocSnapshot,
} from './frame-arena'

export {
  GAMEPLAY_POOL_BUS_WIRED,
  GameplayPoolBus,
  createGameplayPoolBus,
  runObjectPoolSoak,
  probeGameplayPoolBusWired,
  type PooledProjectile,
  type EntityScratch,
  type GameplayPoolBusStats,
  type ObjectPoolSoakResult,
} from './gameplay-pool-bus'

export {
  proveObjectPoolSoak,
  probeObjectPoolWired,
  probeObjectPoolHonesty,
  type ObjectPoolHonesty,
} from './object-pool-honesty'
