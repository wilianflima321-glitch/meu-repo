export interface LegacyPhysicsEngineAdapterSummary {
  contracts: string[];
  executionGate: 'playtest-replay-required';
  migrationTarget: 'lib/physics/physics-system.ts';
}

export interface QuestMissionAdapterSummary {
  contracts: string[];
  evidenceGate: 'branch-balance-localization-review';
  writeBoundary: 'read-only-until-rollback';
}

export interface DotsEcsAdapterSummary {
  contracts: string[];
  executionGate: 'worker-or-playtest-trace';
  mutationBoundary: 'system-scheduler-held';
}

export interface LevelStreamingAdapterSummary {
  contracts: string[];
  executionGate: 'worker-or-sidecar';
  evidenceGate: 'chunk-memory-transition-trace';
}

export interface MultiplayerNetcodeAdapterSummary {
  contracts: string[];
  executionGate: 'sandbox-or-staging-server';
  evidenceGate: 'latency-rollback-authority-trace';
}

export interface FoliageAdapterSummary {
  contracts: string[];
  renderGate: 'lod-culling-performance-trace';
  executionBoundary: 'worker-or-studio-local';
}

export interface VirtualTextureAdapterSummary {
  contracts: string[];
  renderGate: 'tile-cache-feedback-trace';
  executionBoundary: 'worker-or-studio-local';
}

export interface AIAudioAdapterSummary {
  contracts: string[];
  evidenceGate: 'emotion-context-human-review';
  executionBoundary: 'review-only-until-consent';
}

export interface DayNightAdapterSummary {
  contracts: string[];
  renderGate: 'lighting-transition-performance-trace';
  gameplayGate: 'time-state-playtest-required';
}

export interface AssetImportPipelineAdapterSummary {
  contracts: string[];
  executionGate: 'worker-or-studio-local';
  evidenceGate: 'license-checksum-lod-pbr-review';
}

export interface AudioEngineAdapterSummary {
  contracts: string[];
  evidenceGate: 'mix-peak-human-review';
  executionBoundary: 'no-autoplay-in-browser';
}

export interface PostProcessVolumeAdapterSummary {
  contracts: string[];
  renderGate: 'shot-volume-performance-trace';
  executionBoundary: 'review-quality-only';
}

export interface MaterialSystemAdapterSummary {
  contracts: string[];
  renderGate: 'shader-preview-performance-trace';
  evidenceGate: 'pbr-texture-license-review';
}

export function createLegacyPhysicsEngineAdapterSummary(): LegacyPhysicsEngineAdapterSummary {
  return {
    contracts: ['PhysicsWorld', 'RigidBody', 'ColliderConfig'],
    executionGate: 'playtest-replay-required',
    migrationTarget: 'lib/physics/physics-system.ts',
  };
}

export function createQuestMissionAdapterSummary(): QuestMissionAdapterSummary {
  return {
    contracts: ['QuestManager', 'QuestUIRenderer', 'QuestMarkerRenderer'],
    evidenceGate: 'branch-balance-localization-review',
    writeBoundary: 'read-only-until-rollback',
  };
}

export function createDotsEcsAdapterSummary(): DotsEcsAdapterSummary {
  return {
    contracts: ['World', 'SystemScheduler', 'JobSystem'],
    executionGate: 'worker-or-playtest-trace',
    mutationBoundary: 'system-scheduler-held',
  };
}

export function createLevelStreamingAdapterSummary(): LevelStreamingAdapterSummary {
  return {
    contracts: ['LevelStreamingManager', 'StreamingConfig', 'StreamingMetrics'],
    executionGate: 'worker-or-sidecar',
    evidenceGate: 'chunk-memory-transition-trace',
  };
}

export function createMultiplayerNetcodeAdapterSummary(): MultiplayerNetcodeAdapterSummary {
  return {
    contracts: ['NetworkManager', 'RollbackNetcode', 'Matchmaker'],
    executionGate: 'sandbox-or-staging-server',
    evidenceGate: 'latency-rollback-authority-trace',
  };
}

export function createFoliageAdapterSummary(): FoliageAdapterSummary {
  return {
    contracts: ['FoliagePainter', 'FoliageClusterManager', 'GrassGenerator'],
    renderGate: 'lod-culling-performance-trace',
    executionBoundary: 'worker-or-studio-local',
  };
}

export function createVirtualTextureAdapterSummary(): VirtualTextureAdapterSummary {
  return {
    contracts: ['VirtualTextureSystem', 'TileCache', 'FeedbackBuffer'],
    renderGate: 'tile-cache-feedback-trace',
    executionBoundary: 'worker-or-studio-local',
  };
}

export function createAIAudioAdapterSummary(): AIAudioAdapterSummary {
  return {
    contracts: ['AIEmotionalAudioSystem', 'EmotionAnalyzer', 'ContextTracker'],
    evidenceGate: 'emotion-context-human-review',
    executionBoundary: 'review-only-until-consent',
  };
}

export function createDayNightAdapterSummary(): DayNightAdapterSummary {
  return {
    contracts: ['DayNightCycle', 'TimeState', 'SkyState'],
    renderGate: 'lighting-transition-performance-trace',
    gameplayGate: 'time-state-playtest-required',
  };
}

export function createAssetImportPipelineAdapterSummary(): AssetImportPipelineAdapterSummary {
  return {
    contracts: ['AssetImportPipeline', 'ImportedAsset', 'ImportOptions'],
    executionGate: 'worker-or-studio-local',
    evidenceGate: 'license-checksum-lod-pbr-review',
  };
}

export function createAudioEngineAdapterSummary(): AudioEngineAdapterSummary {
  return {
    contracts: ['AethelAudioEngine', 'AudioTrack', 'ChannelConfig'],
    evidenceGate: 'mix-peak-human-review',
    executionBoundary: 'no-autoplay-in-browser',
  };
}

export function createPostProcessVolumeAdapterSummary(): PostProcessVolumeAdapterSummary {
  return {
    contracts: ['PostProcessVolume', 'PostProcessSettings', 'PostProcessVolumeManager'],
    renderGate: 'shot-volume-performance-trace',
    executionBoundary: 'review-quality-only',
  };
}

export function createMaterialSystemAdapterSummary(): MaterialSystemAdapterSummary {
  return {
    contracts: ['AdvancedPBRMaterial', 'MaterialLibrary', 'ShaderGraphCompiler'],
    renderGate: 'shader-preview-performance-trace',
    evidenceGate: 'pbr-texture-license-review',
  };
}

