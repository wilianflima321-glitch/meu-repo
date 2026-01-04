/**
 * Aethel Engine - Library Index
 * 
 * Exporta todos os sistemas e bibliotecas do engine.
 * Organizado por categoria para fácil importação.
 */

// ============================================================================
// CORE ENGINE SYSTEMS
// ============================================================================

export * from './aethel-engine';
export * from './game-engine-core';

// ============================================================================
// GAMEPLAY SYSTEMS
// ============================================================================

export * from './gameplay-ability-system';
export * from './behavior-tree';
export * from './navigation-mesh';
export type { SaveMetadata, SaveData, SaveConfig, SaveableComponent } from './save-load-system';
export {
  Vector3Serializer,
  QuaternionSerializer,
  ColorSerializer,
  SaveCompressor,
  SaveChecksum,
  SaveSlot,
  SaveManager,
  SaveableEntity,
  PlayerState as SaveLoadPlayerState,
} from './save-load-system';
export * from './networking-multiplayer';
export * from './blueprint-system';

// ============================================================================
// RENDERING & GRAPHICS
// ============================================================================

export * from './pbr-shader-pipeline';
export * from './ray-tracing';
export * from './post-process-volume';
export * from './virtual-texture-system';
export * from './volumetric-clouds';
export * from './decal-system';

// ============================================================================
// PHYSICS & SIMULATION
// ============================================================================

export * from './physics-engine-real';
export * from './cloth-simulation';
export * from './destruction-system';
export * from './water-ocean-system';

// ============================================================================
// ANIMATION
// ============================================================================

export * from './skeletal-animation';
export * from './sequencer-cinematics';

// ============================================================================
// PARTICLES & VFX
// ============================================================================

export * from './particle-system-real';
export * from './vfx-graph-editor';

// ============================================================================
// TERRAIN & WORLD
// ============================================================================

export * from './terrain-engine';
export * from './foliage-system';
export * from './world-partition';

// ============================================================================
// ASSET MANAGEMENT
// ============================================================================

export * from './asset-import-pipeline';
export type { Asset, ImportSettings, AssetImportResult, AssetSearchQuery } from './asset-pipeline';
export type {
  AssetType as AssetPipelineAssetType,
  AssetMetadata as AssetPipelineAssetMetadata,
} from './asset-pipeline';
export {
  AssetPipeline,
  getAssetPipeline,
} from './asset-pipeline';
export * from './level-serialization';

// ============================================================================
// INPUT & CONTROLS
// ============================================================================

export type {
  InputDeviceType,
  KeyCode,
  InputBinding,
  InputAction,
  InputContext,
  ComboStep,
  InputCombo,
  GestureConfig,
  InputState,
  RecordedInput,
} from './advanced-input-system';
export {
  InputDeviceManager,
  ComboDetector,
  GestureRecognizer,
  InputRecorder,
  InputManager,
  createFPSContext,
  createUIContext,
  InputBuffer as AdvancedInputBuffer,
} from './advanced-input-system';

// ============================================================================
// AUDIO
// ============================================================================

export * from './audio-synthesis';

// ============================================================================
// VIDEO & MEDIA
// ============================================================================

export * from './video-encoder-real';

// ============================================================================
// AI SYSTEMS
// ============================================================================

export * from './ai-agent-system';
export { 
  initializeEngineState, 
  aiTools, 
  engineState, 
  getAvailableTools, 
  getToolsByCategory 
} from './ai-integration-total';
export { 
  toolsRegistry, 
  executeTool, 
  type ToolResult 
} from './ai-tools-registry';

// ============================================================================
// DEVELOPMENT TOOLS
// ============================================================================

export * from './hot-reload-system';
export * from './profiler-integrated';
export * from './plugin-system';

// ============================================================================
// LOCALIZATION
// ============================================================================

export * from './localization-system';

// ============================================================================
// SYSTEM REGISTRY
// ============================================================================

/**
 * Lista completa de todos os sistemas disponíveis no Aethel Engine
 */
export const AethelEngineSystems = {
  // Core
  core: ['aethel-engine', 'game-engine-core'],
  
  // Gameplay
  gameplay: [
    'gameplay-ability-system',
    'behavior-tree', 
    'navigation-mesh',
    'save-load-system',
    'networking-multiplayer',
    'blueprint-system',
  ],
  
  // Graphics
  graphics: [
    'pbr-shader-pipeline',
    'ray-tracing',
    'post-process-volume',
    'virtual-texture-system',
    'volumetric-clouds',
    'decal-system',
  ],
  
  // Physics
  physics: [
    'physics-engine-real',
    'cloth-simulation',
    'destruction-system',
    'water-ocean-system',
  ],
  
  // Animation
  animation: [
    'skeletal-animation',
    'sequencer-cinematics',
  ],
  
  // VFX
  vfx: [
    'particle-system-real',
    'vfx-graph-editor',
  ],
  
  // World
  world: [
    'terrain-engine',
    'foliage-system',
    'world-partition',
  ],
  
  // Assets
  assets: [
    'asset-import-pipeline',
    'asset-pipeline',
    'level-serialization',
  ],
  
  // Input
  input: ['advanced-input-system'],
  
  // Audio
  audio: ['audio-synthesis'],
  
  // Video
  video: ['video-encoder-real'],
  
  // AI
  ai: [
    'ai-agent-system',
    'ai-integration-total',
    'ai-tools-registry',
  ],
  
  // Dev Tools
  devtools: [
    'hot-reload-system',
    'profiler-integrated',
    'plugin-system',
  ],
  
  // Localization
  localization: ['localization-system'],
} as const;

/**
 * Retorna a contagem total de sistemas
 */
export function getSystemCount(): number {
  return Object.values(AethelEngineSystems).flat().length;
}

/**
 * Retorna todos os sistemas como lista plana
 */
export function getAllSystems(): string[] {
  return Object.values(AethelEngineSystems).flat();
}

/**
 * Retorna sistemas por categoria
 */
export function getSystemsByCategory(category: keyof typeof AethelEngineSystems): readonly string[] {
  return AethelEngineSystems[category];
}
