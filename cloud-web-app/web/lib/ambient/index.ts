/**
 * aethel/ambient — Ambient + Affective Computing scaffold (Onda K.0 / M.0).
 * Edge CSI/TinyML $0 path + CostGuard-gated cloud escalations.
 * Real CSI NIC / TinyML weights / camera fusion / always-on cloud emotion = [HELD].
 */

export type {
  AmbientCapabilitySnapshot,
  AmbientDeltaEvent,
  AmbientDeltaKind,
  AmbientEmotionDelta,
  AmbientEmotionLabel,
  AmbientFocusLockState,
  AmbientFocusLockTarget,
  AmbientSignalSource,
  AmbientTensorFrame,
  CsiProvenance,
  CsiSample,
  GameplayAffectHeuristicInput,
} from './types'

export {
  evaluateAmbientHonesty,
  probeAmbientCapability,
  type AmbientCapabilityProbeInput,
  type AmbientCapabilityStatus,
  type AmbientHonestyReport,
} from './capability'

export {
  createAmbientCostGuardSuppressor,
  DEFAULT_AMBIENT_LLM_ESCALATION_POLICY,
  type AmbientCostGuardSuppressor,
  type AmbientEscalationDecision,
  type AmbientLlmEscalationPolicy,
} from './cost-guard-suppressor'

export {
  createGameplayHeuristicEmotionProvider,
  createHeldCsiEmotionProvider,
  inferGameplayEmotion,
  resolveAmbientEmotionProvider,
  type AmbientEmotionProvider,
} from './fallback-provider'

export { evaluateAmbientFocusLock } from './camera-csi-lock'

export {
  buildAmbientApexMoAPort,
  buildAmbientNpcBtPort,
  buildAmbientPhysicsPort,
  buildClassicAmbientPhysicsPort,
  postureHintFromEmotion,
  priorityBiasFromEmotion,
  type AmbientApexMoAPort,
  type AmbientMultiSurfaceExtension,
  type AmbientNpcBtPort,
  type AmbientNpcPriorityBias,
  type AmbientPhysicsPort,
  type AmbientPhysicsPortOptions,
  type AmbientPostureHint,
} from './ports'

export {
  createAethelAmbientApi,
  getAethelAmbientApi,
  resetAethelAmbientApiForTests,
  type AethelAmbientApi,
  type AmbientEmotionListener,
  type AmbientHeartbeatSpikeListener,
  type CreateAethelAmbientApiOptions,
} from './developer-api'

export {
  AMBIENT_BT_KEYS,
  appendAmbientSliceToMoAPrompt,
  applyAmbientEmotionToBlackboard,
  applyAmbientSliceToMultiSurfacePack,
  getAmbientMoALiveWire,
  getAmbientPhysicsLiveWire,
  recomputeNpcPriorityBias,
  resetAmbientMoALiveWireForTests,
  resetAmbientPhysicsLiveWireForTests,
  resolveAmbientPhysicsPortForConsumer,
  silentAmbientStartupProbe,
  subscribeAmbientEmotionForMoA,
  subscribeAmbientEmotionForPhysics,
  wireAmbientEmotionDeltaLive,
  type AmbientBtEmotionListener,
  type AmbientLiveWireHandle,
  type AmbientLiveWireOptions,
  type AmbientMoAEscalationListener,
  type AmbientPhysicsHintListener,
  type AmbientPhysicsSubscribeHandle,
  type AmbientPhysicsSubscribeOptions,
} from './live-wire'
