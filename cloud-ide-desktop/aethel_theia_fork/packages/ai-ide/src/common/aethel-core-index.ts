// ============================================================================
// AETHEL ENGINE - ÍNDICE DE MÓDULOS CORE
// Exportação centralizada de todos os sistemas implementados
// ============================================================================

// ========================================================================
// LLM & AI
// ========================================================================
export {
  LLMAPIClient,
  EmbeddingsAPIClient,
  LLMAPIError,
  type LLMAPIConfig,
  type ChatMessage,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  type ChatCompletionChunk,
} from './llm/llm-api-client';

export {
  AssetGenerationAI,
  type AssetType,
  type QualityLevel,
  type ArtStyle,
  type TextureGenerationParams,
  type Model3DGenerationParams,
  type AudioGenerationParams,
  type AnimationGenerationParams,
  type CharacterGenerationParams,
  type EnvironmentGenerationParams,
  type GeneratedAsset,
  type GenerationRequest,
} from './ai/asset-generation-ai';

// ========================================================================
// VISUAL SCRIPTING
// ========================================================================
export {
  VisualScriptingEngine,
  type VisualNode,
  type VisualGraph,
  type NodeConnection,
  type NodeDefinition,
  type PortType,
  type NodeCategory,
} from './visual-scripting/visual-scripting-engine';

// ========================================================================
// PHYSICS
// ========================================================================
export {
  PhysicsEngine,
  type RigidBodyDescriptor,
  type ColliderDescriptor,
  type JointDescriptor,
  type CharacterControllerDescriptor,
  type RaycastHit,
  type CollisionEvent,
  type PhysicsWorldConfig,
} from './physics/physics-engine';

// ========================================================================
// RENDERING
// ========================================================================
export {
  WebGPURenderer,
  BuiltinShaders,
  type GPUBufferHandle,
  type GPUTextureHandle,
  type RenderPipelineConfig,
  type DrawCommand,
  type ComputeCommand,
  type MeshGeometry,
  type RenderStats,
} from './render/webgpu-renderer';

// ========================================================================
// GAME AI
// ========================================================================
export {
  BehaviorTreeEngine,
  NavMeshSystem,
  PerceptionSystem,
  Blackboard,
  type BTStatus,
  type BTNodeType,
  type BTActionNode,
  type BTConditionNode,
  type BTContext,
  type NavMeshData,
  type NavPolygon,
  type PathPoint,
  type PerceivedEntity,
  type Stimulus,
  type StimulusType,
  type IPhysicsRaycastProvider,
  type RaycastResult as AIRaycastResult,
} from './game-ai/game-ai-engine';

// ========================================================================
// OS AUTOMATION
// ========================================================================
export {
  OSAutomationEngine,
  AutomationWorkflowBuilder,
  workflow,
  type AutomationMacro,
  type MacroStep,
  type WindowInfo,
  type ProcessInfo,
  type ScreenRegion,
  type KeyboardShortcut,
  type MouseButton,
  type KeyModifier,
} from './automation/os-automation-engine';

// ========================================================================
// COMPILER
// ========================================================================
export {
  NativeCompilerBridge,
  generateCMakeLists,
  type CompilationConfig,
  type CompilationResult,
  type CompilerDiagnostic,
  type CompilerLanguage,
  type TargetPlatform,
  type OutputType,
  type Toolchain,
  type SymbolInfo,
  type DependencyInfo,
} from './compiler/native-compiler-bridge';

// ========================================================================
// PERSISTENCE
// ========================================================================
export {
  PersistenceEngine,
  StateManager,
  MemoryCache,
  type PersistenceConfig,
  type StorageBackend,
  type StorageEntry,
  type EntryMetadata,
  type QueryFilter,
  type QueryOptions,
  type ChangeEvent,
  type Transaction,
  type StateSlice,
} from './persistence/memory-persistence-engine';

// ========================================================================
// ENGINE CORE (Runtime, ECS, Scenes)
// ========================================================================
export {
  // Engine Runtime
  EngineState,
  EngineMode,
  SubsystemPriority,
  EngineTime,
  AethelEngineRuntime,
  FrameStats,
  ENGINE_TYPES,
  EngineModuleInfo,
  type IEngineSubsystem,
  type EngineConfig,
  
  // ECS
  ECSWorld,
  TransformComponent,
  MeshRendererComponent,
  CameraComponent,
  LightComponent,
  RigidbodyComponent,
  ColliderComponent,
  AudioSourceComponent,
  ScriptComponent,
  AnimatorComponent,
  CanvasComponent,
  registerComponent,
  createComponentInstance,
  createEntityAtPosition,
  createCamera,
  createLight,
  type EntityId,
  type ComponentType,
  type SystemPriority,
  type IComponent,
  type ISystem,
  type ComponentQuery,
  type Archetype,
  type EntityDescriptor,
  
  // Scene Management
  Scene,
  SceneManager,
  SceneLoadState,
  SceneLoadMode,
  WorldCompositionManager,
  type SceneId,
  type LayerId,
  type Vector3,
  type StreamingSettings,
  type SceneMetadata,
  type EnvironmentSettings,
  type SceneEntityRef,
  type SceneNode,
  type SceneLayer,
  
  // Subsystems
  PhysicsSubsystem,
  RenderSubsystem,
  type PhysicsConfig,
  type PhysicsBody,
  type CollisionInfo,
  type RaycastResult,
  type BodyType,
  type RenderConfig,
  type Camera,
  type Renderable,
  type Light,
  type LightType,
  type RenderPassType,
} from './engine';

// ========================================================================
// AUDIO PROCESSING
// ========================================================================
export {
  AudioProcessingEngine,
  type AudioTrack,
  type AudioEffect,
  type AudioAnalysis,
} from './audio/audio-processing-engine';

// ========================================================================
// 3D SCENE ENGINE
// ========================================================================
export {
  Scene3DEngine,
  type Scene3D,
  type SceneObject,
  type Material,
  type Quaternion,
  type Transform3D,
} from './3d/scene-3d-engine';

// ========================================================================
// VIDEO TIMELINE
// ========================================================================
export {
  VideoTimelineEngine,
  type VideoProject,
  type Track,
  type Clip,
  type Keyframe,
} from './video/video-timeline-engine';

// ========================================================================
// IMAGE PROCESSING
// ========================================================================
export {
  ImageLayerEngine,
  type Layer,
  type LayerType,
  type BlendMode,
} from './image/image-layer-engine';

// ========================================================================
// TEXT TYPOGRAPHY
// ========================================================================
export {
  TextTypographyEngine,
  type TextDocument as TypographyTextDocument,
  type FontMetrics,
  type TextLayout,
} from './text/text-typography-engine';

// ========================================================================
// VECTOR GRAPHICS
// ========================================================================
export {
  VectorProcessingEngine,
  type VectorPath,
  type VectorShape,
  type PathCommand,
} from './vector/vector-processing-engine';

// ========================================================================
// UNIFIED RENDER PIPELINE
// ========================================================================
export {
  UnifiedRenderPipeline,
  type RenderPass,
} from './render/unified-render-pipeline';

// ========================================================================
// WEBSOCKET SERVICE
// ========================================================================
export {
  WebSocketService,
} from './websocket/websocket-service';

// ========================================================================
// COLLABORATION ENGINE
// ========================================================================
export {
  CollaborationEngine,
  type CollaborationSession,
  type CollaborationUser,
  type SharedDocument,
  type DocumentOperation,
  type ConnectionState,
  type UserRole,
  type ChatChannel,
} from './collaboration/collaboration-engine';

// ========================================================================
// PLUGIN SYSTEM
// ========================================================================
export {
  PluginSystem,
  type Plugin,
  type PluginManifest,
  type PluginContext,
  type PluginAPI,
} from './plugins/plugin-system';

// ========================================================================
// EXPORT PIPELINE
// ========================================================================
export {
  ExportPipeline,
  type ExportResult,
} from './export/export-pipeline';

// ========================================================================
// PREVIEW ENGINE
// ========================================================================
export {
  PreviewEngine,
} from './preview/preview-engine';

// ========================================================================
// EFFECTS LIBRARY
// ========================================================================
export {
  EffectsLibrary,
  type EffectPreset,
  type EffectCategory,
  type EffectParameter,
} from './effects/effects-library';

// ========================================================================
// PROJECT MANAGER
// ========================================================================
export {
  ProjectManager,
  type Project,
  type ProjectSettings,
} from './project/project-manager';

// ========================================================================
// ASSET MANAGER
// ========================================================================
export {
  AssetManager,
  type Asset,
  type AssetMetadata,
  type AssetBundle,
  type AssetImporter,
} from './assets/asset-manager';

// ========================================================================
// AI INTEGRATION
// ========================================================================
export {
  AIIntegrationLayer,
} from './ai/ai-integration-layer';

// ========================================================================
// WORKFLOW AUTOMATION
// ========================================================================
export {
  WorkflowAutomationEngine,
  type Workflow,
  type WorkflowState,
  type WorkflowTrigger,
  type WorkflowExecution,
} from './automation/workflow-automation-engine';

// ========================================================================
// AAA SYSTEMS - ADVANCED RENDERING
// ========================================================================
export {
  AdvancedRenderingEngine,
} from './rendering/advanced-rendering-engine';

// ========================================================================
// AAA SYSTEMS - SKELETAL ANIMATION
// ========================================================================
export {
  SkeletalAnimationEngine,
} from './animation/skeletal-animation-engine';

// ========================================================================
// AAA SYSTEMS - WORLD PARTITION
// ========================================================================
export {
  WorldPartitionSystem,
} from './world/world-partition-system';

// ========================================================================
// AAA SYSTEMS - ADVANCED PHYSICS
// ========================================================================
export {
  AdvancedPhysicsEngine,
} from './physics/advanced-physics-engine';

// ========================================================================
// AAA SYSTEMS - SPATIAL AUDIO
// ========================================================================
export {
  SpatialAudioEngine,
} from './audio/spatial-audio-engine';

// ========================================================================
// AAA SYSTEMS - MULTIPLAYER
// ========================================================================
export {
  MultiplayerSystem,
} from './networking/multiplayer-system';

// ========================================================================
// AAA SYSTEMS - ADVANCED GAME AI
// ========================================================================
export {
  GameAIEngine as AdvancedGameAIEngine,
  GOAPPlanner,
  UtilityAISystem,
  AIAgent,
  SquadAISystem,
  AILLMIntegration,
} from './game-ai/advanced-game-ai-engine';

// ========================================================================
// AAA SYSTEMS - PROCEDURAL GENERATION
// ========================================================================
export {
  ProceduralGenerationEngine,
} from './procedural/procedural-generation-engine';

// ========================================================================
// AAA SYSTEMS - ADVANCED INPUT
// ========================================================================
export {
  AdvancedInputSystem,
} from './input/advanced-input-system';

// ========================================================================
// AAA SYSTEMS - AI COPILOT
// ========================================================================
export {
  AethelCopilot,
} from './copilot/aethel-copilot';

// ========================================================================
// AAA SYSTEMS - NATIVE BRIDGE
// ========================================================================
export {
  NativeBridge,
} from './native/native-bridge';

// ========================================================================
// AAA SYSTEMS - ENGINE FACADE
// ========================================================================
export {
  AethelEngine,
  createAethelEngine,
  ENGINE_SYMBOLS,
} from './engine/aethel-engine-facade';

// ========================================================================
// AAA SYSTEMS INDEX
// ========================================================================
export {
  AAA_TYPES,
  AAASystemsContainerModule,
  createAAAContainer,
  initializeAAASystems,
  disposeAAASystems,
  quickStartAAA,
  getAAASsystemsHealth,
} from './aaa-systems-index';

// ========================================================================
// TESTING SYSTEM
// ========================================================================
export {
  // Test Runner
  TestRunner,
  TestReporter,
  TestWatcher,
  TestCoverage,
  TestSystem,
  // Test Building
  TestSuiteBuilder,
  TestContext,
  // Assertions
  Expect,
  expect,
  // Mocking
  createMock,
  spyOn,
  // Quick Start
  createTestSystem,
  describe,
  // Errors
  SkipTestError,
  TimeoutTestError,
  // DI
  TEST_TYPES,
  TestingContainerModule,
  // Module Info
  TestingModuleInfo,
  // Types
  type TestStatus,
  type TestType,
  type AssertionType,
  type TestConfig,
  type TestResult,
  type TestError,
  type AssertionResult,
  type TestLog,
  type TestSuite,
  type TestCase,
  type TestRunSummary,
  type CoverageReport,
  type CoverageStats,
  type FileCoverage,
  type TestFilter,
  type WatchOptions,
  type ExpectChain,
  type MockFunction,
  type ITestContext,
  type ITestRunner,
  type ITestReporter,
  type ITestSystem,
} from './testing/test-runner-system';

// ========================================================================
// ERROR HANDLING SYSTEM
// ========================================================================
export {
  // Enums
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy,
  CircuitState,
  // Error Classes
  AethelError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  TimeoutError,
  ConfigurationError,
  // Result & Option Types
  Result,
  Option,
  // Services
  ErrorHandler,
  CircuitBreaker,
  ErrorBoundary,
  ErrorHandlerSymbol,
  // Utilities
  assert,
  assertDefined,
  safeJsonParse,
  withTimeout,
  errorHandler,
  // Types
  type ErrorContext,
  type ErrorBreadcrumb,
  type ErrorReport,
  type CircuitBreakerConfig,
  type RetryConfig,
  type RecoveryResult,
} from './errors/error-handling-system';

// ========================================================================
// UX ENHANCEMENT SYSTEM
// ========================================================================
export {
  // Enums
  ToastType,
  ProgressType,
  Easing,
  FeedbackType,
  Breakpoint,
  // Toast System
  ToastManager,
  ToastManagerSymbol,
  // Progress System
  ProgressManager,
  ProgressManagerSymbol,
  // Feedback System
  FeedbackSystem,
  FeedbackSystemSymbol,
  // Keybinding System
  KeybindingManager,
  KeybindingManagerSymbol,
  // Onboarding System
  OnboardingManager,
  OnboardingManagerSymbol,
  // Accessibility System
  AccessibilityManager,
  AccessibilityManagerSymbol,
  // Responsive System
  ResponsiveManager,
  ResponsiveManagerSymbol,
  // Animation Utilities
  AnimationHelper,
  // Types
  type ToastConfig,
  type ProgressConfig,
  type AnimationConfig,
  type Keybinding,
  type OnboardingStep,
  type A11yConfig,
} from './ux/ux-enhancement-system';

// ========================================================================
// IDE TOOLKIT SYSTEM
// ========================================================================
export {
  // Document Management
  DocumentManager,
  DocumentManagerSymbol,
  // Command System
  CommandRegistry,
  CommandRegistrySymbol,
  // UI Services
  QuickPickService,
  QuickPickServiceSymbol,
  InputBoxService,
  InputBoxServiceSymbol,
  StatusBarService,
  StatusBarServiceSymbol,
  PanelManager,
  PanelManagerSymbol,
  TreeViewService,
  TreeViewServiceSymbol,
  // Diagnostics
  DiagnosticCollection,
  DiagnosticCollectionSymbol,
  DiagnosticSeverity,
  // Configuration
  ConfigurationService,
  ConfigurationServiceSymbol,
  // Workspace
  WorkspaceService,
  WorkspaceServiceSymbol,
  // Unified Toolkit
  IDEToolkit,
  createIDEToolkit,
  createIDEToolkitContainer,
  // DI
  IDE_TOOLKIT_TYPES,
  IDEToolkitContainerModule,
  // Types
  type Uri,
  type Position,
  type Range,
  type Selection,
  type TextEdit,
  type WorkspaceEdit,
  type Diagnostic,
  type TextDocument as IDETextDocument,
  type TextEditor,
  type TextEditorEdit,
  type Command,
  type QuickPickItem,
  type QuickPickOptions,
  type InputBoxOptions,
  type StatusBarItem,
  type WorkspaceFolder,
  type ViewColumn,
  type StatusBarAlignment,
} from './toolkit/ide-toolkit';

// ========================================================================
// IDE EXPERIENCE INDEX (UNIFIED)
// ========================================================================
export {
  // Unified Types
  IDE_EXPERIENCE_TYPES,
  // Unified Container Module
  IDEExperienceContainerModule,
  // Unified Experience Class
  IDEExperience,
  // Quick Start Function
  quickStartIDEExperience,
  // Default Configurations
  DEFAULT_KEYBINDINGS,
  DEFAULT_ONBOARDING_STEPS,
  // Module Info
  IDEExperienceModuleInfo,
  // Initialization
  initializeIDEExperience,
  // Types
  type IDEExperienceConfig,
} from './experience/ide-experience-index';

// ========================================================================
// VERSION INFO
// ========================================================================
export const AETHEL_VERSION = '2.3.0';
export const AETHEL_BUILD_DATE = new Date().toISOString();
export const AETHEL_MODULES = [
  'llm-api-client',
  'asset-generation-ai',
  'visual-scripting-engine',
  'physics-engine',
  'webgpu-renderer',
  'game-ai-engine',
  'os-automation-engine',
  'native-compiler-bridge',
  'memory-persistence-engine',
  'engine-runtime',
  'ecs-world',
  'scene-manager',
  'audio-processing-engine',
  'scene-3d-engine',
  'video-timeline-engine',
  'image-layer-engine',
  'text-typography-engine',
  'vector-processing-engine',
  'unified-render-pipeline',
  'websocket-service',
  'collaboration-engine',
  'plugin-system',
  'export-pipeline',
  'preview-engine',
  'effects-library',
  'project-manager',
  'asset-manager',
  'ai-integration-layer',
  'workflow-automation-engine',
  // AAA Systems
  'advanced-rendering-engine',
  'skeletal-animation-engine',
  'world-partition-system',
  'advanced-physics-engine',
  'spatial-audio-engine',
  'multiplayer-system',
  'advanced-game-ai-engine',
  'procedural-generation-engine',
  'advanced-input-system',
  'aethel-copilot',
  'native-bridge',
  'aethel-engine-facade',
  // IDE Experience Systems
  'error-handling-system',
  'ux-enhancement-system',
  'ide-toolkit',
  'ide-experience-index',
  'test-runner-system',
] as const;
