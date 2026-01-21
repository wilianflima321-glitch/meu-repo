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

// ============================================================================
// UNIFIED SDK & NEW SYSTEMS (2026)
// ============================================================================

// SDK Unificado
export { 
    aethel, 
    AethelSDK, 
    GatewayClient,
} from './aethel-sdk';

export type {
    Platform,
    MessageOptions,
    ProgressOptions,
    RenderOptions,
    GenerationOptions,
    CollaborationOptions as SDKCollaborationOptions,
    QuickPickItem,
    InputBoxOptions,
    OpenDialogOptions,
    SaveDialogOptions
} from './aethel-sdk';

// Audio Engine
export {
    AethelAudioEngine,
    getAudioEngine,
    useAudio,
} from './audio-engine';

export type {
    AudioTrack,
    AudioInstance,
    AudioChannel,
    ChannelConfig,
    PlayOptions,
    AudioEffect
} from './audio-engine';

// Yjs Collaboration
export {
    CollaborationSession,
    useYjsCollaboration,
    bindMonaco,
    Y
} from './yjs-collaboration';

export type {
    UserInfo,
    CursorPosition,
    SelectionRange,
    CollaborationConfig,
    SceneObject,
    UseCollaborationOptions,
    UseCollaborationResult,
    MonacoBinding
} from './yjs-collaboration';

// ============================================================================
// NEW STUDIO SYSTEMS (2026+)
// ============================================================================

// Level Streaming
export {
  LevelStreamingManager,
  LevelLoader,
  StreamingProvider,
  useLevelStreaming,
  useLevelState,
} from './streaming/level-streaming-system';

// Event Bus
export {
  EventBus,
  EventChannel,
  TypedEventEmitter,
  Signal,
  ComputedSignal,
  DeferredEvent,
  OnEvent,
  EmitEvent,
  EventBusProvider,
  useEventBus,
  useEvent,
  useSignal,
  useChannel,
} from './events/event-bus-system';

// Quest System
export {
  QuestManager,
  QuestBuilder,
  QuestProvider,
  useQuests,
  useQuestProgress,
} from './quests/quest-system';

// Inventory System
export {
  Inventory,
  EquipmentManager,
  ItemRegistry,
  ItemBuilder,
  LootGenerator,
  InventoryProvider,
  useInventory,
  useEquipment,
} from './inventory/inventory-system';

// Camera System
export {
  CameraController,
  CameraPathBuilder,
  CameraProvider,
  useCameraController,
  useCameraFollow,
  useCameraShake,
  useCameraMode,
} from './camera/camera-system';

// Cutscene System
export {
  CutscenePlayer,
  CutsceneManager,
  CutsceneBuilder,
  CutsceneProvider,
  useCutscene,
  useCutsceneEvents,
} from './cutscene/cutscene-system';

// Debug Console
export {
  DebugConsole,
  PerformanceMonitor,
  StatsOverlay,
  DebugProvider,
  useDebugConsole,
  useConsoleLogs,
  useConsoleCommands,
  usePerformanceMonitor,
  useWatchVariable,
  formatLogEntry,
  getLogLevelColor,
} from './debug/debug-console';

// Profiler System
export {
  Profiler,
  Timeline,
  Profile,
  ProfileAsync,
  ProfilerProvider,
  useProfiler,
  useTimeline,
  useProfilerRecording,
  useFrameMetrics,
  useBudgetViolations,
  useProfileScope,
} from './debug/profiler-system';

// Object Inspector
export {
  ObjectInspector,
  Inspectable,
  Range,
  Slider,
  Color,
  Hidden,
  Readonly,
  Category,
  InspectorProvider,
  useObjectInspector,
  useInspectedObject,
  useInspectorSelection,
  usePropertyEditor,
  useInspectorSearch,
} from './debug/object-inspector';

// Replay System
export {
  ReplayRecorder,
  ReplayPlayer,
  ReplayManager,
  InputSerializer,
  StateSerializer,
  ReplayProvider,
  useReplayManager,
  useReplayRecorder,
  useReplayPlayer,
  useReplayRecordings,
} from './replay/replay-system';

// Plugin System
export {
  PluginLoader,
  PluginSandbox,
  PluginProvider,
  usePluginLoader,
  usePlugins,
  usePlugin,
  usePluginHook,
  useCallHook,
} from './plugins/plugin-system';

// Main Engine Entry Point
export { 
  AethelEngine as Engine,
  EngineProvider,
  useEngine,
  useEngineState,
} from './engine/aethel-engine';

// ============================================================================
// ENVIRONMENT SYSTEMS (2026+)
// ============================================================================

// Weather System
export {
  WeatherSystem,
  DEFAULT_WEATHER_PRESETS,
  WeatherProvider,
  useWeather,
  useWeatherState,
  useWeatherTransition,
  useWind,
  useLightning,
} from './environment/weather-system';

// Day/Night Cycle
export {
  DayNightCycle,
  DayNightProvider,
  useDayNightCycle,
  useTimeState,
  useSkyState,
  useSunDirection,
  useTimeControl,
  useSeason,
} from './environment/day-night-cycle';

// ============================================================================
// SAVE/LOAD SYSTEMS (2026+)
// ============================================================================

// Save Manager
export {
  SaveManager as AdvancedSaveManager,
  JSONSerializer,
  CompressedSerializer,
  SaveMigrator,
  SaveValidator,
  SaveProvider,
  useSaveManager,
  useSaveSlots,
  useSaveStatus,
  useSaveOperations,
  usePlayTime,
} from './save/save-manager';

// ============================================================================
// SETTINGS SYSTEMS (2026+)
// ============================================================================

// Settings System
export {
  SettingsManager,
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_GAMEPLAY_SETTINGS,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  DEFAULT_NETWORK_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  GRAPHICS_PRESETS,
  DIFFICULTY_PRESETS,
  SettingsProvider,
  useSettings,
  useAllSettings,
  useAudioSettings,
  useVideoSettings,
  useControlSettings,
  useGameplaySettings,
  useAccessibilitySettings,
  useSetting,
} from './settings/settings-system';

// ============================================================================
// UI SYSTEMS (2026+)
// ============================================================================

// Notification System
export {
  NotificationManager,
  NOTIFICATION_TEMPLATES,
  NotificationProvider,
  useNotifications,
  useVisibleNotifications,
  useNotificationsByPosition,
  useToast,
  useGameNotifications,
  useNotificationProgress,
} from './ui/notification-system';

// ============================================================================
// INPUT SYSTEMS (2026+)
// ============================================================================

// Haptics System
export {
  HapticsSystem,
  HAPTIC_EFFECTS,
  HapticsProvider,
  useHaptics,
  useHapticFeedback,
  useGameHaptics,
  useUIHaptics,
  useHapticsEnabled,
  useHapticsIntensity,
} from './input/haptics-system';

// Controller Mapper
export {
  ControllerMapper,
  DEFAULT_PROFILES,
  ControllerProvider,
  useControllerMapper,
  useControllers,
  useController,
  useGamepadButton,
  useGamepadAxis,
  useGameAction,
  useControllerProfiles,
  useVibration,
} from './input/controller-mapper';

// Tooltip System
export {
  TooltipManager,
  TooltipProvider,
  useTooltipManager,
  useTooltip,
  useActiveTooltip,
  useVisibleTooltips,
  useTooltipHideAll,
} from './ui/tooltip-system';

// ============================================================================
// CAPTURE SYSTEMS (2026+)
// ============================================================================

// Screenshot & Capture System
export {
  CaptureSystem,
  PHOTO_FILTER_PRESETS,
  CaptureProvider,
  useCaptureSystem,
  useScreenshot,
  useVideoRecording,
  usePhotoMode,
  useCaptureGallery,
  useCanvasCapture,
} from './capture/capture-system';

// ============================================================================
// WORLD SYSTEMS (2026+)
// ============================================================================

// World Streaming & LOD
export {
  WorldStreamingSystem,
  Octree,
  WorldStreamingProvider,
  useWorldStreaming,
  useStreamingStats,
  useViewerPosition,
  useVisibleChunks,
  useChunkState,
  useEntityLOD,
} from './world/world-streaming';

// ============================================================================
// VERSION & ENGINE INFO
// ============================================================================

export const AETHEL_VERSION = '1.1.0';
export const ENGINE_NAME = 'Aethel Engine';
export const BUILD_DATE = new Date().toISOString();
