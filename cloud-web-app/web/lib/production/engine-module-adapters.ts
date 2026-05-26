import { Easings, type SequenceConfig, type TrackType } from '@/lib/sequencer-cinematics';
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
import type { AudioGroupConfig, AudioSourceConfig } from '@/lib/engine/audio-manager-contracts';
import type { ColliderShape, PhysicsSettings, RigidBodyConfig } from '@/lib/physics/physics-system-contracts';
import type { RayTracingConfig } from '@/lib/ray-tracing-contracts';
import type { BrushSettings, NoiseSettings, TerrainSettings } from '@/lib/terrain/terrain-contracts';
import type { CullingStats, NaniteConfig, VirtualizedMesh } from '@/lib/nanite-virtualized-geometry-contracts';
import type { StreamingConfig } from '@/lib/world/world-streaming';
import type { ControlRigConfig } from '@/lib/control-rig-system';
import type { FacialConfig } from '@/lib/facial-animation-system';
import type { CloudConfig } from '@/lib/volumetric-clouds';

export type EngineModuleAdapterSurface =
  | '/studio/film'
  | '/studio/level'
  | '/studio/scene'
  | '/studio/vfx'
  | '/studio/rig'
  | '/studio/facial'
  | '/studio/landscape'
  | '/studio/terrain'
  | '/studio/audio';

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

export const ENGINE_MODULE_ADAPTERS: EngineModuleAdapter[] = [
  {
    modulePath: 'lib/sequencer-cinematics.ts',
    ownerSurface: '/studio/film',
    contractKind: 'shot-sequence-summary',
    runtimeBoundary: 'summary-adapter',
    exportedContracts: ['SequenceConfig', 'TrackType', 'Easings'],
    evidenceSignals: ['shot-id', 'sequence-duration', 'render-evidence-link'],
  },
  {
    modulePath: 'lib/postprocessing/post-processing-system.ts',
    ownerSurface: '/studio/level',
    contractKind: 'viewport-quality-preset',
    runtimeBoundary: 'render-gated',
    exportedContracts: ['PostProcessingSettings', 'BloomSettings', 'ColorGradingSettings'],
    evidenceSignals: ['quality-preset', 'render-readiness', 'postfx-cost-class'],
  },
  {
    modulePath: 'lib/particles/advanced-particle-system.ts',
    ownerSurface: '/studio/vfx',
    contractKind: 'vfx-particle-preset',
    runtimeBoundary: 'summary-adapter',
    exportedContracts: ['ParticleSystemSettings', 'EmitterSettings', 'CollisionSettings'],
    evidenceSignals: ['emitter-shape', 'max-particles', 'collision-enabled'],
  },
  {
    modulePath: 'lib/particle-system-real.ts',
    ownerSurface: '/studio/vfx',
    contractKind: 'gpu-particle-runtime',
    runtimeBoundary: 'render-gated',
    exportedContracts: ['ParticleEmitterConfig', 'ParticleForce', 'ParticleCollider'],
    evidenceSignals: ['gpu-runtime', 'blend-mode', 'world-space'],
  },
  {
    modulePath: 'lib/ai/behavior-tree-system.tsx',
    ownerSurface: '/studio/level',
    contractKind: 'gameplay-validation-graph',
    runtimeBoundary: 'type-contract',
    exportedContracts: ['BehaviorTree', 'AIAgent', 'BehaviorNode'],
    evidenceSignals: ['npc-decision-path', 'playtest-failure-link', 'agent-scope-lock'],
  },
  {
    modulePath: 'lib/world/world-streaming.tsx',
    ownerSurface: '/studio/landscape',
    contractKind: 'world-partition-summary',
    runtimeBoundary: 'summary-adapter',
    exportedContracts: ['StreamingConfig', 'WorldChunk', 'WorldStreamingSystem'],
    evidenceSignals: ['chunk-budget', 'loaded-chunks', 'memory-budget-mb'],
  },
  {
    modulePath: 'lib/control-rig-system.ts',
    ownerSurface: '/studio/rig',
    contractKind: 'character-rig-validation',
    runtimeBoundary: 'type-contract',
    exportedContracts: ['ControlRigConfig', 'RigHierarchy', 'RigControl'],
    evidenceSignals: ['ik-targets', 'constraint-count', 'rig-review-packet'],
  },
  {
    modulePath: 'lib/facial-animation-system.ts',
    ownerSurface: '/studio/facial',
    contractKind: 'facial-animation-review',
    runtimeBoundary: 'type-contract',
    exportedContracts: ['FacialConfig', 'FACSPose', 'LipSyncData'],
    evidenceSignals: ['facs-pose', 'lip-sync-evidence', 'emotion-state'],
  },
  {
    modulePath: 'lib/ray-tracing.ts',
    ownerSurface: '/studio/scene',
    contractKind: 'ray-tracing-readiness',
    runtimeBoundary: 'render-gated',
    exportedContracts: ['RayTracingConfig', 'BVHNode', 'RTMaterial'],
    evidenceSignals: ['p95-frame-ms', 'denoiser-enabled', 'human-render-review'],
  },
  {
    modulePath: 'lib/nanite-virtualized-geometry.ts',
    ownerSurface: '/studio/scene',
    contractKind: 'virtualized-geometry-summary',
    runtimeBoundary: 'render-gated',
    exportedContracts: ['NaniteConfig', 'VirtualizedMesh', 'CullingStats'],
    evidenceSignals: ['visible-meshlets', 'triangles-rendered', 'memory-budget-mb'],
  },
  {
    modulePath: 'lib/assets/asset-importer.ts',
    ownerSurface: '/studio/level',
    contractKind: 'asset-import-intake',
    runtimeBoundary: 'worker-held',
    exportedContracts: ['AssetType', 'ImportOptions', 'ImportedAsset'],
    evidenceSignals: ['license-report', 'checksum', 'lod-pbr-collision-evidence'],
  },
  {
    modulePath: 'lib/engine/audio-manager.ts',
    ownerSurface: '/studio/audio',
    contractKind: 'audio-mix-summary',
    runtimeBoundary: 'summary-adapter',
    exportedContracts: ['AudioSourceConfig', 'AudioGroupConfig', 'AudioSnapshot'],
    evidenceSignals: ['mix-snapshot', 'peak-levels', 'human-audio-review'],
  },
  {
    modulePath: 'lib/audio/spatial-audio-system.ts',
    ownerSurface: '/studio/audio',
    contractKind: 'spatial-audio-review',
    runtimeBoundary: 'summary-adapter',
    exportedContracts: ['AudioSettings', 'SoundSettings', 'ReverbSettings'],
    evidenceSignals: ['listener-position', 'reverb-zone', 'headphone-review'],
  },
  {
    modulePath: 'lib/physics/physics-system.ts',
    ownerSurface: '/studio/level',
    contractKind: 'physics-readiness-summary',
    runtimeBoundary: 'type-contract',
    exportedContracts: ['PhysicsSettings', 'RigidBodyConfig', 'ColliderShape'],
    evidenceSignals: ['fixed-timestep', 'collision-budget', 'playtest-physics-report'],
  },
  {
    modulePath: 'lib/terrain/terrain-system.ts',
    ownerSurface: '/studio/terrain',
    contractKind: 'terrain-world-summary',
    runtimeBoundary: 'worker-held',
    exportedContracts: ['TerrainSettings', 'NoiseSettings', 'BrushSettings'],
    evidenceSignals: ['heightmap-resolution', 'lod-levels', 'terrain-collider-evidence'],
  },
  {
    modulePath: 'lib/volumetric-clouds.ts',
    ownerSurface: '/studio/scene',
    contractKind: 'volumetric-atmosphere-summary',
    runtimeBoundary: 'render-gated',
    exportedContracts: ['CloudConfig', 'VolumetricCloudRenderer', 'CloudShadowMap'],
    evidenceSignals: ['cloud-raymarch-budget', 'shadow-map-budget', 'performance-trace'],
  },
];

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
