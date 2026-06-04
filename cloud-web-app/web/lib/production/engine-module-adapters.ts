import { Easings, type SequenceConfig, type TrackType } from '@/lib/sequencer-cinematics';
import { ENGINE_MODULE_ADAPTERS } from './engine-module-adapters.catalog';
import type {
  BloomSettings,
  ColorGradingSettings,
  PostProcessingSettings,
} from '@/lib/postprocessing/post-processing-system';
import type { ParticleSystemSettings } from '@/lib/particles/advanced-particle-system';
import type { ParticleEmitterConfig } from '@/lib/particle-system-real';
import type { BehaviorTree } from '@/lib/ai/behavior-tree-system';
import type { AudioSettings, ReverbSettings, SoundSettings } from '@/lib/audio/spatial-audio-contracts';
import type { AssetType, ImportOptions } from '@/lib/assets/asset-importer-contracts';
import type { CameraConfig, CameraMode, FollowSettings, ShakeSettings } from '@/lib/camera/camera-system';
import type { DialogueConversation, DialogueEvent, DialogueState } from '@/lib/dialogue/dialogue-contracts';
import type { AudioGroupConfig, AudioSourceConfig } from '@/lib/engine/audio-manager-contracts';
import type { WeatherConfig, WeatherState, WeatherType } from '@/lib/environment/weather-system';
import type { HapticMotor, HapticsConfig, HapticType } from '@/lib/input/haptics-system';
import type { MotionDatabase, MotionMatchingConfig, MotionMatchResult } from '@/lib/motion-matching-contracts';
import type { ColliderShape, PhysicsSettings, RigidBodyConfig } from '@/lib/physics/physics-system-contracts';
import type { RayTracingConfig } from '@/lib/ray-tracing-contracts';
import type { BrushSettings, NoiseSettings, TerrainSettings } from '@/lib/terrain/terrain-contracts';
import type { XRConfig, XRControllerState, XRFeature } from '@/lib/webxr-vr-contracts';
import type { CullingStats, NaniteConfig, VirtualizedMesh } from '@/lib/nanite-virtualized-geometry-contracts';
import type { StreamingConfig } from '@/lib/world/world-streaming';
import type { ControlRigConfig } from '@/lib/control-rig-system';
import type { FacialConfig } from '@/lib/facial-animation-system';
import type { CloudConfig } from '@/lib/volumetric-clouds';
import {
  createLegacyPhysicsEngineAdapterSummary,
  createQuestMissionAdapterSummary,
  createDotsEcsAdapterSummary,
  createLevelStreamingAdapterSummary,
  createMultiplayerNetcodeAdapterSummary,
  createFoliageAdapterSummary,
  createVirtualTextureAdapterSummary,
  createAIAudioAdapterSummary,
  createDayNightAdapterSummary,
  createAssetImportPipelineAdapterSummary,
  createAudioEngineAdapterSummary,
  createPostProcessVolumeAdapterSummary,
  createMaterialSystemAdapterSummary,
} from '@/lib/production/engine-module-adapter-extended-summaries';
export {
  createLegacyPhysicsEngineAdapterSummary,
  createQuestMissionAdapterSummary,
  createDotsEcsAdapterSummary,
  createLevelStreamingAdapterSummary,
  createMultiplayerNetcodeAdapterSummary,
  createFoliageAdapterSummary,
  createVirtualTextureAdapterSummary,
  createAIAudioAdapterSummary,
  createDayNightAdapterSummary,
  createAssetImportPipelineAdapterSummary,
  createAudioEngineAdapterSummary,
  createPostProcessVolumeAdapterSummary,
  createMaterialSystemAdapterSummary,
} from '@/lib/production/engine-module-adapter-extended-summaries';

export type EngineModuleAdapterSurface =
  | '/studio/film'
  | '/studio/animation'
  | '/studio/level'
  | '/studio/vfx'
  | '/studio/audio'
  | '/studio/quest';

export type EngineModuleRuntimeBoundary = 'summary-adapter' | 'type-contract' | 'render-gated' | 'worker-held';

export interface EngineModuleAdapter {
  modulePath: string;
  ownerSurface: EngineModuleAdapterSurface;
  contractKind: string;
  runtimeBoundary: EngineModuleRuntimeBoundary;
  exportedContracts: string[];
  evidenceSignals: string[];
}

export interface EngineModuleEvidencePacket {
  modulePath: string;
  ownerSurface: EngineModuleAdapterSurface;
  contractKind: string;
  runtimeBoundary: EngineModuleRuntimeBoundary;
  exportedContracts: string[];
  evidenceSignals: string[];
  summaryKeys: string[];
}

export interface SequencerAdapterSummary {
  sequence: SequenceConfig;
  trackTypes: TrackType[];
  easingKeys: string[];
}

export interface PostProcessingAdapterSummary {
  base: Pick<PostProcessingSettings, 'enabled' | 'antialiasing' | 'tonemapping' | 'exposure'>;
  bloom: Pick<BloomSettings, 'enabled' | 'intensity' | 'threshold' | 'radius'>;
  colorGrading: Pick<ColorGradingSettings, 'enabled' | 'contrast' | 'saturation' | 'lutIntensity'>;
}

export interface ParticleAdapterSummary {
  advanced: Pick<ParticleSystemSettings, 'id' | 'name' | 'duration' | 'looping' | 'maxParticles'>;
  realtime: Pick<ParticleEmitterConfig, 'maxParticles' | 'emissionRate' | 'blendMode' | 'worldSpace'>;
}

export interface CharacterRigAdapterSummary {
  rigContract: keyof ControlRigConfig;
  facialContract: keyof FacialConfig;
  behaviorTreeContract: keyof BehaviorTree;
}

export interface WorldStreamingAdapterSummary {
  streamingContract: keyof StreamingConfig;
  memoryBudgetSignal: 'memoryBudgetMB';
}

export interface RayTracingAdapterSummary {
  configKeys: (keyof RayTracingConfig)[];
  renderGate: 'performance-trace-required';
}

export interface NaniteAdapterSummary {
  configKeys: (keyof NaniteConfig)[];
  meshContract: keyof VirtualizedMesh;
  cullingSignal: keyof CullingStats;
}

export interface AssetImporterAdapterSummary {
  acceptedTypes: AssetType[];
  optionKeys: (keyof ImportOptions)[];
  executionBoundary: 'worker-or-studio-local';
}

export interface AudioRuntimeAdapterSummary {
  sourceKeys: (keyof AudioSourceConfig)[];
  groupKeys: (keyof AudioGroupConfig)[];
  reviewGate: 'mix-evidence-required';
}

export interface SpatialAudioAdapterSummary {
  settingsKeys: (keyof AudioSettings)[];
  soundKeys: (keyof SoundSettings)[];
  reverbKeys: (keyof ReverbSettings)[];
}

export interface PhysicsAdapterSummary {
  settingsKeys: (keyof PhysicsSettings)[];
  rigidBodyKeys: (keyof RigidBodyConfig)[];
  colliderKeys: (keyof ColliderShape)[];
}

export interface TerrainAdapterSummary {
  settingsKeys: (keyof TerrainSettings)[];
  noiseKeys: (keyof NoiseSettings)[];
  brushKeys: (keyof BrushSettings)[];
}

export interface VolumetricCloudAdapterSummary {
  configKeys: (keyof CloudConfig)[];
  renderGate: 'webgpu-or-cloud-trace-required';
}

export interface DialogueRuntimeAdapterSummary {
  conversationKeys: (keyof DialogueConversation)[];
  stateKeys: (keyof DialogueState)[];
  eventKeys: (keyof DialogueEvent)[];
}

export interface WebXRAdapterSummary {
  configKeys: (keyof XRConfig)[];
  optionalFeatures: XRFeature[];
  controllerSignal: keyof XRControllerState;
}

export interface MotionMatchingAdapterSummary {
  configKeys: (keyof MotionMatchingConfig)[];
  databaseKey: keyof MotionDatabase;
  resultKey: keyof MotionMatchResult;
}

export interface HapticsAdapterSummary {
  configKeys: (keyof HapticsConfig)[];
  supportedMotors: HapticMotor[];
  hapticTypes: HapticType[];
}

export interface WeatherAdapterSummary {
  configKeys: (keyof WeatherConfig)[];
  stateKeys: (keyof WeatherState)[];
  weatherTypes: WeatherType[];
}

export interface CameraRuntimeAdapterSummary {
  configKeys: (keyof CameraConfig)[];
  followKeys: (keyof FollowSettings)[];
  shakeKeys: (keyof ShakeSettings)[];
  modes: CameraMode[];
}

export { ENGINE_MODULE_ADAPTERS } from './engine-module-adapters.catalog';

export function createSequencerAdapterSummary(): SequencerAdapterSummary {
  return {
    sequence: {
      duration: 30,
      playbackSpeed: 1,
      loop: false,
    },
    trackTypes: ['camera', 'transform', 'light', 'audio', 'event', 'material', 'visibility'],
    easingKeys: Object.keys(Easings),
  };
}

export function createPostProcessingAdapterSummary(): PostProcessingAdapterSummary {
  return {
    base: {
      enabled: true,
      antialiasing: 'taa',
      tonemapping: 'aces',
      exposure: 1,
    },
    bloom: {
      enabled: true,
      intensity: 0.35,
      threshold: 0.82,
      radius: 0.56,
    },
    colorGrading: {
      enabled: true,
      contrast: 1.05,
      saturation: 1.08,
      lutIntensity: 0.4,
    },
  };
}

export function createParticleAdapterSummary(): ParticleAdapterSummary {
  return {
    advanced: {
      id: 'studio-vfx-default',
      name: 'Studio VFX Default',
      duration: 4,
      looping: true,
      maxParticles: 12000,
    },
    realtime: {
      maxParticles: 12000,
      emissionRate: 900,
      blendMode: 'additive',
      worldSpace: true,
    },
  };
}

export function createCharacterRigAdapterSummary(): CharacterRigAdapterSummary {
  return {
    rigContract: 'controls',
    facialContract: 'enableLipSync',
    behaviorTreeContract: 'tick',
  };
}

export function createWorldStreamingAdapterSummary(): WorldStreamingAdapterSummary {
  return {
    streamingContract: 'maxLoadedChunks',
    memoryBudgetSignal: 'memoryBudgetMB',
  };
}

export function createRayTracingAdapterSummary(): RayTracingAdapterSummary {
  return {
    configKeys: ['maxBounces', 'samplesPerPixel', 'denoiseEnabled', 'resolution'],
    renderGate: 'performance-trace-required',
  };
}

export function createNaniteAdapterSummary(): NaniteAdapterSummary {
  return {
    configKeys: ['targetTrianglesPerMeshlet', 'screenSpaceErrorThreshold', 'memoryBudgetMB'],
    meshContract: 'totalTriangles',
    cullingSignal: 'trianglesRendered',
  };
}

export function createAssetImporterAdapterSummary(): AssetImporterAdapterSummary {
  return {
    acceptedTypes: ['model', 'texture', 'hdri', 'audio', 'video', 'font', 'data'],
    optionKeys: ['optimizeMeshes', 'computeNormals', 'centerModel', 'normalizeScale'],
    executionBoundary: 'worker-or-studio-local',
  };
}

export function createAudioRuntimeAdapterSummary(): AudioRuntimeAdapterSummary {
  return {
    sourceKeys: ['name', 'spatial', 'volume', 'loop', 'group'],
    groupKeys: ['name', 'volume', 'muted', 'effects'],
    reviewGate: 'mix-evidence-required',
  };
}

export function createSpatialAudioAdapterSummary(): SpatialAudioAdapterSummary {
  return {
    settingsKeys: ['masterVolume', 'spatialEnabled', 'maxDistance', 'dopplerFactor'],
    soundKeys: ['volume', 'spatial', 'minDistance', 'maxDistance', 'category'],
    reverbKeys: ['decay', 'preDelay', 'wetDry'],
  };
}

export function createPhysicsAdapterSummary(): PhysicsAdapterSummary {
  return {
    settingsKeys: ['gravity', 'fixedTimeStep', 'maxSubSteps', 'solverIterations'],
    rigidBodyKeys: ['type', 'mass', 'material', 'collisionGroup', 'collisionMask'],
    colliderKeys: ['type', 'offset', 'rotation', 'vertices', 'indices'],
  };
}

export function createTerrainAdapterSummary(): TerrainAdapterSummary {
  return {
    settingsKeys: ['width', 'depth', 'resolution', 'lodLevels', 'generateCollider'],
    noiseKeys: ['type', 'seed', 'octaves', 'frequency', 'amplitude'],
    brushKeys: ['size', 'strength', 'falloff', 'shape'],
  };
}

export function createVolumetricCloudAdapterSummary(): VolumetricCloudAdapterSummary {
  return {
    configKeys: ['coverage', 'density', 'cloudScale', 'godRaysEnabled', 'shadowsEnabled'],
    renderGate: 'webgpu-or-cloud-trace-required',
  };
}

export function createDialogueRuntimeAdapterSummary(): DialogueRuntimeAdapterSummary {
  return {
    conversationKeys: ['id', 'title', 'startNode', 'nodes', 'characters'],
    stateKeys: ['currentConversation', 'currentNode', 'isActive', 'history'],
    eventKeys: ['type', 'key', 'value', 'params'],
  };
}

export function createWebXRAdapterSummary(): WebXRAdapterSummary {
  return {
    configKeys: ['sessionMode', 'referenceSpace', 'features', 'optionalFeatures', 'handTracking'],
    optionalFeatures: ['hand-tracking', 'hit-test', 'depth-sensing', 'light-estimation'],
    controllerSignal: 'trigger',
  };
}

export function createMotionMatchingAdapterSummary(): MotionMatchingAdapterSummary {
  return {
    configKeys: ['searchRadius', 'blendTime', 'trajectoryPredictionTime', 'footLockingEnabled'],
    databaseKey: 'poses',
    resultKey: 'cost',
  };
}

export function createHapticsAdapterSummary(): HapticsAdapterSummary {
  return {
    configKeys: ['enabled', 'globalIntensity', 'respectAccessibility', 'gamepadEnabled'],
    supportedMotors: ['weak', 'strong', 'both'],
    hapticTypes: ['light', 'medium', 'success', 'warning', 'error', 'impact', 'selection'],
  };
}

export function createWeatherAdapterSummary(): WeatherAdapterSummary {
  return {
    configKeys: ['enablePrecipitation', 'enableLightning', 'enableFog', 'enableWind'],
    stateKeys: ['type', 'intensity', 'windSpeed', 'humidity', 'temperature'],
    weatherTypes: ['clear', 'cloudy', 'rain', 'thunderstorm', 'fog', 'snow'],
  };
}

export function createCameraRuntimeAdapterSummary(): CameraRuntimeAdapterSummary {
  return {
    configKeys: ['fov', 'near', 'far', 'aspect'],
    followKeys: ['target', 'offset', 'lookAtOffset', 'smoothing'],
    shakeKeys: ['intensity', 'duration', 'frequency', 'decay'],
    modes: ['first_person', 'third_person', 'orbit', 'free', 'cinematic'],
  };
}

const SUMMARY_KEYS_BY_CONTRACT_KIND: Record<string, () => string[]> = {
  'shot-sequence-summary': () => Object.keys(createSequencerAdapterSummary()),
  'viewport-quality-preset': () => Object.keys(createPostProcessingAdapterSummary()),
  'vfx-particle-preset': () => Object.keys(createParticleAdapterSummary()),
  'gpu-particle-runtime': () => Object.keys(createParticleAdapterSummary().realtime),
  'gameplay-validation-graph': () => Object.keys(createCharacterRigAdapterSummary()),
  'world-partition-summary': () => Object.keys(createWorldStreamingAdapterSummary()),
  'character-rig-validation': () => Object.keys(createCharacterRigAdapterSummary()),
  'facial-animation-review': () => Object.keys(createCharacterRigAdapterSummary()),
  'ray-tracing-readiness': () => Object.keys(createRayTracingAdapterSummary()),
  'virtualized-geometry-summary': () => Object.keys(createNaniteAdapterSummary()),
  'asset-import-intake': () => Object.keys(createAssetImporterAdapterSummary()),
  'audio-mix-summary': () => Object.keys(createAudioRuntimeAdapterSummary()),
  'spatial-audio-review': () => Object.keys(createSpatialAudioAdapterSummary()),
  'physics-readiness-summary': () => Object.keys(createPhysicsAdapterSummary()),
  'terrain-world-summary': () => Object.keys(createTerrainAdapterSummary()),
  'volumetric-atmosphere-summary': () => Object.keys(createVolumetricCloudAdapterSummary()),
  'dialogue-runtime-review': () => Object.keys(createDialogueRuntimeAdapterSummary()),
  'immersive-xr-readiness': () => Object.keys(createWebXRAdapterSummary()),
  'motion-matching-readiness': () => Object.keys(createMotionMatchingAdapterSummary()),
  'haptics-feedback-review': () => Object.keys(createHapticsAdapterSummary()),
  'weather-state-summary': () => Object.keys(createWeatherAdapterSummary()),
  'camera-runtime-review': () => Object.keys(createCameraRuntimeAdapterSummary()),
  'legacy-physics-engine-boundary': () => Object.keys(createLegacyPhysicsEngineAdapterSummary()),
  'quest-mission-governance': () => Object.keys(createQuestMissionAdapterSummary()),
  'dots-ecs-scheduler-boundary': () => Object.keys(createDotsEcsAdapterSummary()),
  'level-streaming-readiness': () => Object.keys(createLevelStreamingAdapterSummary()),
  'multiplayer-netcode-readiness': () => Object.keys(createMultiplayerNetcodeAdapterSummary()),
  'foliage-density-readiness': () => Object.keys(createFoliageAdapterSummary()),
  'virtual-texture-readiness': () => Object.keys(createVirtualTextureAdapterSummary()),
  'ai-audio-emotion-review': () => Object.keys(createAIAudioAdapterSummary()),
  'day-night-cycle-readiness': () => Object.keys(createDayNightAdapterSummary()),
  'asset-import-pipeline-readiness': () => Object.keys(createAssetImportPipelineAdapterSummary()),
  'browser-audio-engine-boundary': () => Object.keys(createAudioEngineAdapterSummary()),
  'post-process-volume-readiness': () => Object.keys(createPostProcessVolumeAdapterSummary()),
  'material-system-readiness': () => Object.keys(createMaterialSystemAdapterSummary()),
};

export function createEngineModuleEvidencePacket(adapter: EngineModuleAdapter): EngineModuleEvidencePacket {
  return {
    modulePath: adapter.modulePath,
    ownerSurface: adapter.ownerSurface,
    contractKind: adapter.contractKind,
    runtimeBoundary: adapter.runtimeBoundary,
    exportedContracts: [...adapter.exportedContracts],
    evidenceSignals: [...adapter.evidenceSignals],
    summaryKeys: SUMMARY_KEYS_BY_CONTRACT_KIND[adapter.contractKind]?.() ?? [],
  };
}

export function listEngineModuleEvidencePackets(surface?: EngineModuleAdapterSurface): EngineModuleEvidencePacket[] {
  return listEngineModuleAdapters(surface).map(createEngineModuleEvidencePacket);
}

export function listEngineModuleAdapters(surface?: EngineModuleAdapterSurface): EngineModuleAdapter[] {
  return surface
    ? ENGINE_MODULE_ADAPTERS.filter((adapter) => adapter.ownerSurface === surface)
    : [...ENGINE_MODULE_ADAPTERS];
}

export function validateEngineModuleAdapters(adapters: EngineModuleAdapter[] = ENGINE_MODULE_ADAPTERS): string[] {
  const failures: string[] = [];
  const seen = new Set<string>();

  for (const adapter of adapters) {
    if (seen.has(adapter.modulePath)) failures.push(`${adapter.modulePath}: duplicate adapter`);
    seen.add(adapter.modulePath);
    if (!adapter.ownerSurface.startsWith('/studio/')) failures.push(`${adapter.modulePath}: missing Studio owner`);
    if (adapter.exportedContracts.length < 2) failures.push(`${adapter.modulePath}: needs exported contracts`);
    if (adapter.evidenceSignals.length < 2) failures.push(`${adapter.modulePath}: needs evidence signals`);
    if (createEngineModuleEvidencePacket(adapter).summaryKeys.length === 0) {
      failures.push(`${adapter.modulePath}: missing summary adapter`);
    }
  }

  return failures;
}
