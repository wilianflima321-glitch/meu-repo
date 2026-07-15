export {
  buildPhysicsAiOnDevicePhotogrammetryMatrix,
  type PhysicsAiOnDevicePhotogrammetryMatrix,
  type PhysicsAiOnDevicePhotogrammetryMatrixInput,
} from '@/lib/ai-ondevice/capability-matrix'
export {
  buildMediaPipeBridgeCapability,
  MEDIAPIPE_BRIDGE_REQUIRED_RECEIPTS,
  type MediaPipeBridgeCapability,
  type MediaPipeBridgeInput,
  type OnDeviceAiTask,
} from '@/lib/ai-ondevice/face-mesh/mediapipe-bridge'
export {
  buildLumaPhotogrammetryProviderCapability,
  LUMA_PHOTOGRAMMETRY_REQUIRED_RECEIPTS,
  type LumaPhotogrammetryProviderCapability,
  type LumaPhotogrammetryProviderInput,
  type PhotogrammetryOutputKind,
  type PhotogrammetryProvider,
} from '@/lib/integrations/photogrammetry/luma-ai'
export {
  buildRapierPhysicsDriverCapability,
  RAPIER_DRIVER_REQUIRED_EVIDENCE,
  type PhysicsRuntimeTarget,
  type RapierPhysicsDriverCapability,
  type RapierPhysicsDriverInput,
} from '@/lib/physics/rapier-driver'
