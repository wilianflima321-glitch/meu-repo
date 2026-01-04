"use strict";
// ============================================================================
// AETHEL ENGINE - ÍNDICE DE MÓDULOS CORE
// Exportação centralizada de todos os sistemas implementados
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoTimelineEngine = exports.Scene3DEngine = exports.AudioProcessingEngine = exports.RenderSubsystem = exports.PhysicsSubsystem = exports.WorldCompositionManager = exports.SceneLoadMode = exports.SceneLoadState = exports.SceneManager = exports.Scene = exports.createLight = exports.createCamera = exports.createEntityAtPosition = exports.createComponentInstance = exports.registerComponent = exports.CanvasComponent = exports.AnimatorComponent = exports.ScriptComponent = exports.AudioSourceComponent = exports.ColliderComponent = exports.RigidbodyComponent = exports.LightComponent = exports.CameraComponent = exports.MeshRendererComponent = exports.TransformComponent = exports.ECSWorld = exports.EngineModuleInfo = exports.ENGINE_TYPES = exports.AethelEngineRuntime = exports.EngineTime = exports.MemoryCache = exports.StateManager = exports.PersistenceEngine = exports.generateCMakeLists = exports.NativeCompilerBridge = exports.workflow = exports.AutomationWorkflowBuilder = exports.OSAutomationEngine = exports.Blackboard = exports.PerceptionSystem = exports.NavMeshSystem = exports.BehaviorTreeEngine = exports.BuiltinShaders = exports.WebGPURenderer = exports.PhysicsEngine = exports.VisualScriptingEngine = exports.AssetGenerationAI = exports.LLMAPIError = exports.EmbeddingsAPIClient = exports.LLMAPIClient = void 0;
exports.createMock = exports.expect = exports.Expect = exports.TestContext = exports.TestSuiteBuilder = exports.TestSystem = exports.TestCoverage = exports.TestWatcher = exports.TestReporter = exports.TestRunner = exports.getAAASsystemsHealth = exports.quickStartAAA = exports.disposeAAASystems = exports.initializeAAASystems = exports.createAAAContainer = exports.AAASystemsContainerModule = exports.AAA_TYPES = exports.ENGINE_SYMBOLS = exports.createAethelEngine = exports.AethelEngine = exports.NativeBridge = exports.AethelCopilot = exports.AdvancedInputSystem = exports.ProceduralGenerationEngine = exports.AILLMIntegration = exports.SquadAISystem = exports.AIAgent = exports.UtilityAISystem = exports.GOAPPlanner = exports.AdvancedGameAIEngine = exports.MultiplayerSystem = exports.SpatialAudioEngine = exports.AdvancedPhysicsEngine = exports.WorldPartitionSystem = exports.SkeletalAnimationEngine = exports.AdvancedRenderingEngine = exports.WorkflowAutomationEngine = exports.AIIntegrationLayer = exports.AssetManager = exports.ProjectManager = exports.EffectsLibrary = exports.PreviewEngine = exports.ExportPipeline = exports.PluginSystem = exports.CollaborationEngine = exports.WebSocketService = exports.UnifiedRenderPipeline = exports.VectorProcessingEngine = exports.TextTypographyEngine = exports.ImageLayerEngine = void 0;
exports.AnimationHelper = exports.ResponsiveManagerSymbol = exports.ResponsiveManager = exports.AccessibilityManagerSymbol = exports.AccessibilityManager = exports.OnboardingManagerSymbol = exports.OnboardingManager = exports.KeybindingManagerSymbol = exports.KeybindingManager = exports.FeedbackSystemSymbol = exports.FeedbackSystem = exports.ProgressManagerSymbol = exports.ProgressManager = exports.ToastManagerSymbol = exports.ToastManager = exports.Breakpoint = exports.FeedbackType = exports.Easing = exports.ProgressType = exports.ToastType = exports.errorHandler = exports.withTimeout = exports.safeJsonParse = exports.assertDefined = exports.assert = exports.ErrorHandlerSymbol = exports.ErrorBoundary = exports.CircuitBreaker = exports.ErrorHandler = exports.Option = exports.Result = exports.ConfigurationError = exports.TimeoutError = exports.NotFoundError = exports.AuthenticationError = exports.ValidationError = exports.NetworkError = exports.AethelError = exports.CircuitState = exports.RecoveryStrategy = exports.ErrorCategory = exports.ErrorSeverity = exports.TestingModuleInfo = exports.TestingContainerModule = exports.TEST_TYPES = exports.TimeoutTestError = exports.SkipTestError = exports.describe = exports.createTestSystem = exports.spyOn = void 0;
exports.AETHEL_MODULES = exports.AETHEL_BUILD_DATE = exports.AETHEL_VERSION = exports.initializeIDEExperience = exports.IDEExperienceModuleInfo = exports.DEFAULT_ONBOARDING_STEPS = exports.DEFAULT_KEYBINDINGS = exports.quickStartIDEExperience = exports.IDEExperience = exports.IDEExperienceContainerModule = exports.IDE_EXPERIENCE_TYPES = exports.IDEToolkitContainerModule = exports.IDE_TOOLKIT_TYPES = exports.createIDEToolkitContainer = exports.createIDEToolkit = exports.IDEToolkit = exports.WorkspaceServiceSymbol = exports.WorkspaceService = exports.ConfigurationServiceSymbol = exports.ConfigurationService = exports.DiagnosticSeverity = exports.DiagnosticCollectionSymbol = exports.DiagnosticCollection = exports.TreeViewServiceSymbol = exports.TreeViewService = exports.PanelManagerSymbol = exports.PanelManager = exports.StatusBarServiceSymbol = exports.StatusBarService = exports.InputBoxServiceSymbol = exports.InputBoxService = exports.QuickPickServiceSymbol = exports.QuickPickService = exports.CommandRegistrySymbol = exports.CommandRegistry = exports.DocumentManagerSymbol = exports.DocumentManager = void 0;
// ========================================================================
// LLM & AI
// ========================================================================
var llm_api_client_1 = require("./llm/llm-api-client");
Object.defineProperty(exports, "LLMAPIClient", { enumerable: true, get: function () { return llm_api_client_1.LLMAPIClient; } });
Object.defineProperty(exports, "EmbeddingsAPIClient", { enumerable: true, get: function () { return llm_api_client_1.EmbeddingsAPIClient; } });
Object.defineProperty(exports, "LLMAPIError", { enumerable: true, get: function () { return llm_api_client_1.LLMAPIError; } });
var asset_generation_ai_1 = require("./ai/asset-generation-ai");
Object.defineProperty(exports, "AssetGenerationAI", { enumerable: true, get: function () { return asset_generation_ai_1.AssetGenerationAI; } });
// ========================================================================
// VISUAL SCRIPTING
// ========================================================================
var visual_scripting_engine_1 = require("./visual-scripting/visual-scripting-engine");
Object.defineProperty(exports, "VisualScriptingEngine", { enumerable: true, get: function () { return visual_scripting_engine_1.VisualScriptingEngine; } });
// ========================================================================
// PHYSICS
// ========================================================================
var physics_engine_1 = require("./physics/physics-engine");
Object.defineProperty(exports, "PhysicsEngine", { enumerable: true, get: function () { return physics_engine_1.PhysicsEngine; } });
// ========================================================================
// RENDERING
// ========================================================================
var webgpu_renderer_1 = require("./render/webgpu-renderer");
Object.defineProperty(exports, "WebGPURenderer", { enumerable: true, get: function () { return webgpu_renderer_1.WebGPURenderer; } });
Object.defineProperty(exports, "BuiltinShaders", { enumerable: true, get: function () { return webgpu_renderer_1.BuiltinShaders; } });
// ========================================================================
// GAME AI
// ========================================================================
var game_ai_engine_1 = require("./game-ai/game-ai-engine");
Object.defineProperty(exports, "BehaviorTreeEngine", { enumerable: true, get: function () { return game_ai_engine_1.BehaviorTreeEngine; } });
Object.defineProperty(exports, "NavMeshSystem", { enumerable: true, get: function () { return game_ai_engine_1.NavMeshSystem; } });
Object.defineProperty(exports, "PerceptionSystem", { enumerable: true, get: function () { return game_ai_engine_1.PerceptionSystem; } });
Object.defineProperty(exports, "Blackboard", { enumerable: true, get: function () { return game_ai_engine_1.Blackboard; } });
// ========================================================================
// OS AUTOMATION
// ========================================================================
var os_automation_engine_1 = require("./automation/os-automation-engine");
Object.defineProperty(exports, "OSAutomationEngine", { enumerable: true, get: function () { return os_automation_engine_1.OSAutomationEngine; } });
Object.defineProperty(exports, "AutomationWorkflowBuilder", { enumerable: true, get: function () { return os_automation_engine_1.AutomationWorkflowBuilder; } });
Object.defineProperty(exports, "workflow", { enumerable: true, get: function () { return os_automation_engine_1.workflow; } });
// ========================================================================
// COMPILER
// ========================================================================
var native_compiler_bridge_1 = require("./compiler/native-compiler-bridge");
Object.defineProperty(exports, "NativeCompilerBridge", { enumerable: true, get: function () { return native_compiler_bridge_1.NativeCompilerBridge; } });
Object.defineProperty(exports, "generateCMakeLists", { enumerable: true, get: function () { return native_compiler_bridge_1.generateCMakeLists; } });
// ========================================================================
// PERSISTENCE
// ========================================================================
var memory_persistence_engine_1 = require("./persistence/memory-persistence-engine");
Object.defineProperty(exports, "PersistenceEngine", { enumerable: true, get: function () { return memory_persistence_engine_1.PersistenceEngine; } });
Object.defineProperty(exports, "StateManager", { enumerable: true, get: function () { return memory_persistence_engine_1.StateManager; } });
Object.defineProperty(exports, "MemoryCache", { enumerable: true, get: function () { return memory_persistence_engine_1.MemoryCache; } });
// ========================================================================
// ENGINE CORE (Runtime, ECS, Scenes)
// ========================================================================
var engine_1 = require("./engine");
Object.defineProperty(exports, "EngineTime", { enumerable: true, get: function () { return engine_1.EngineTime; } });
Object.defineProperty(exports, "AethelEngineRuntime", { enumerable: true, get: function () { return engine_1.AethelEngineRuntime; } });
Object.defineProperty(exports, "ENGINE_TYPES", { enumerable: true, get: function () { return engine_1.ENGINE_TYPES; } });
Object.defineProperty(exports, "EngineModuleInfo", { enumerable: true, get: function () { return engine_1.EngineModuleInfo; } });
// ECS
Object.defineProperty(exports, "ECSWorld", { enumerable: true, get: function () { return engine_1.ECSWorld; } });
Object.defineProperty(exports, "TransformComponent", { enumerable: true, get: function () { return engine_1.TransformComponent; } });
Object.defineProperty(exports, "MeshRendererComponent", { enumerable: true, get: function () { return engine_1.MeshRendererComponent; } });
Object.defineProperty(exports, "CameraComponent", { enumerable: true, get: function () { return engine_1.CameraComponent; } });
Object.defineProperty(exports, "LightComponent", { enumerable: true, get: function () { return engine_1.LightComponent; } });
Object.defineProperty(exports, "RigidbodyComponent", { enumerable: true, get: function () { return engine_1.RigidbodyComponent; } });
Object.defineProperty(exports, "ColliderComponent", { enumerable: true, get: function () { return engine_1.ColliderComponent; } });
Object.defineProperty(exports, "AudioSourceComponent", { enumerable: true, get: function () { return engine_1.AudioSourceComponent; } });
Object.defineProperty(exports, "ScriptComponent", { enumerable: true, get: function () { return engine_1.ScriptComponent; } });
Object.defineProperty(exports, "AnimatorComponent", { enumerable: true, get: function () { return engine_1.AnimatorComponent; } });
Object.defineProperty(exports, "CanvasComponent", { enumerable: true, get: function () { return engine_1.CanvasComponent; } });
Object.defineProperty(exports, "registerComponent", { enumerable: true, get: function () { return engine_1.registerComponent; } });
Object.defineProperty(exports, "createComponentInstance", { enumerable: true, get: function () { return engine_1.createComponentInstance; } });
Object.defineProperty(exports, "createEntityAtPosition", { enumerable: true, get: function () { return engine_1.createEntityAtPosition; } });
Object.defineProperty(exports, "createCamera", { enumerable: true, get: function () { return engine_1.createCamera; } });
Object.defineProperty(exports, "createLight", { enumerable: true, get: function () { return engine_1.createLight; } });
// Scene Management
Object.defineProperty(exports, "Scene", { enumerable: true, get: function () { return engine_1.Scene; } });
Object.defineProperty(exports, "SceneManager", { enumerable: true, get: function () { return engine_1.SceneManager; } });
Object.defineProperty(exports, "SceneLoadState", { enumerable: true, get: function () { return engine_1.SceneLoadState; } });
Object.defineProperty(exports, "SceneLoadMode", { enumerable: true, get: function () { return engine_1.SceneLoadMode; } });
Object.defineProperty(exports, "WorldCompositionManager", { enumerable: true, get: function () { return engine_1.WorldCompositionManager; } });
// Subsystems
Object.defineProperty(exports, "PhysicsSubsystem", { enumerable: true, get: function () { return engine_1.PhysicsSubsystem; } });
Object.defineProperty(exports, "RenderSubsystem", { enumerable: true, get: function () { return engine_1.RenderSubsystem; } });
// ========================================================================
// AUDIO PROCESSING
// ========================================================================
var audio_processing_engine_1 = require("./audio/audio-processing-engine");
Object.defineProperty(exports, "AudioProcessingEngine", { enumerable: true, get: function () { return audio_processing_engine_1.AudioProcessingEngine; } });
// ========================================================================
// 3D SCENE ENGINE
// ========================================================================
var scene_3d_engine_1 = require("./3d/scene-3d-engine");
Object.defineProperty(exports, "Scene3DEngine", { enumerable: true, get: function () { return scene_3d_engine_1.Scene3DEngine; } });
// ========================================================================
// VIDEO TIMELINE
// ========================================================================
var video_timeline_engine_1 = require("./video/video-timeline-engine");
Object.defineProperty(exports, "VideoTimelineEngine", { enumerable: true, get: function () { return video_timeline_engine_1.VideoTimelineEngine; } });
// ========================================================================
// IMAGE PROCESSING
// ========================================================================
var image_layer_engine_1 = require("./image/image-layer-engine");
Object.defineProperty(exports, "ImageLayerEngine", { enumerable: true, get: function () { return image_layer_engine_1.ImageLayerEngine; } });
// ========================================================================
// TEXT TYPOGRAPHY
// ========================================================================
var text_typography_engine_1 = require("./text/text-typography-engine");
Object.defineProperty(exports, "TextTypographyEngine", { enumerable: true, get: function () { return text_typography_engine_1.TextTypographyEngine; } });
// ========================================================================
// VECTOR GRAPHICS
// ========================================================================
var vector_processing_engine_1 = require("./vector/vector-processing-engine");
Object.defineProperty(exports, "VectorProcessingEngine", { enumerable: true, get: function () { return vector_processing_engine_1.VectorProcessingEngine; } });
// ========================================================================
// UNIFIED RENDER PIPELINE
// ========================================================================
var unified_render_pipeline_1 = require("./render/unified-render-pipeline");
Object.defineProperty(exports, "UnifiedRenderPipeline", { enumerable: true, get: function () { return unified_render_pipeline_1.UnifiedRenderPipeline; } });
// ========================================================================
// WEBSOCKET SERVICE
// ========================================================================
var websocket_service_1 = require("./websocket/websocket-service");
Object.defineProperty(exports, "WebSocketService", { enumerable: true, get: function () { return websocket_service_1.WebSocketService; } });
// ========================================================================
// COLLABORATION ENGINE
// ========================================================================
var collaboration_engine_1 = require("./collaboration/collaboration-engine");
Object.defineProperty(exports, "CollaborationEngine", { enumerable: true, get: function () { return collaboration_engine_1.CollaborationEngine; } });
// ========================================================================
// PLUGIN SYSTEM
// ========================================================================
var plugin_system_1 = require("./plugins/plugin-system");
Object.defineProperty(exports, "PluginSystem", { enumerable: true, get: function () { return plugin_system_1.PluginSystem; } });
// ========================================================================
// EXPORT PIPELINE
// ========================================================================
var export_pipeline_1 = require("./export/export-pipeline");
Object.defineProperty(exports, "ExportPipeline", { enumerable: true, get: function () { return export_pipeline_1.ExportPipeline; } });
// ========================================================================
// PREVIEW ENGINE
// ========================================================================
var preview_engine_1 = require("./preview/preview-engine");
Object.defineProperty(exports, "PreviewEngine", { enumerable: true, get: function () { return preview_engine_1.PreviewEngine; } });
// ========================================================================
// EFFECTS LIBRARY
// ========================================================================
var effects_library_1 = require("./effects/effects-library");
Object.defineProperty(exports, "EffectsLibrary", { enumerable: true, get: function () { return effects_library_1.EffectsLibrary; } });
// ========================================================================
// PROJECT MANAGER
// ========================================================================
var project_manager_1 = require("./project/project-manager");
Object.defineProperty(exports, "ProjectManager", { enumerable: true, get: function () { return project_manager_1.ProjectManager; } });
// ========================================================================
// ASSET MANAGER
// ========================================================================
var asset_manager_1 = require("./assets/asset-manager");
Object.defineProperty(exports, "AssetManager", { enumerable: true, get: function () { return asset_manager_1.AssetManager; } });
// ========================================================================
// AI INTEGRATION
// ========================================================================
var ai_integration_layer_1 = require("./ai/ai-integration-layer");
Object.defineProperty(exports, "AIIntegrationLayer", { enumerable: true, get: function () { return ai_integration_layer_1.AIIntegrationLayer; } });
// ========================================================================
// WORKFLOW AUTOMATION
// ========================================================================
var workflow_automation_engine_1 = require("./automation/workflow-automation-engine");
Object.defineProperty(exports, "WorkflowAutomationEngine", { enumerable: true, get: function () { return workflow_automation_engine_1.WorkflowAutomationEngine; } });
// ========================================================================
// AAA SYSTEMS - ADVANCED RENDERING
// ========================================================================
var advanced_rendering_engine_1 = require("./rendering/advanced-rendering-engine");
Object.defineProperty(exports, "AdvancedRenderingEngine", { enumerable: true, get: function () { return advanced_rendering_engine_1.AdvancedRenderingEngine; } });
// ========================================================================
// AAA SYSTEMS - SKELETAL ANIMATION
// ========================================================================
var skeletal_animation_engine_1 = require("./animation/skeletal-animation-engine");
Object.defineProperty(exports, "SkeletalAnimationEngine", { enumerable: true, get: function () { return skeletal_animation_engine_1.SkeletalAnimationEngine; } });
// ========================================================================
// AAA SYSTEMS - WORLD PARTITION
// ========================================================================
var world_partition_system_1 = require("./world/world-partition-system");
Object.defineProperty(exports, "WorldPartitionSystem", { enumerable: true, get: function () { return world_partition_system_1.WorldPartitionSystem; } });
// ========================================================================
// AAA SYSTEMS - ADVANCED PHYSICS
// ========================================================================
var advanced_physics_engine_1 = require("./physics/advanced-physics-engine");
Object.defineProperty(exports, "AdvancedPhysicsEngine", { enumerable: true, get: function () { return advanced_physics_engine_1.AdvancedPhysicsEngine; } });
// ========================================================================
// AAA SYSTEMS - SPATIAL AUDIO
// ========================================================================
var spatial_audio_engine_1 = require("./audio/spatial-audio-engine");
Object.defineProperty(exports, "SpatialAudioEngine", { enumerable: true, get: function () { return spatial_audio_engine_1.SpatialAudioEngine; } });
// ========================================================================
// AAA SYSTEMS - MULTIPLAYER
// ========================================================================
var multiplayer_system_1 = require("./networking/multiplayer-system");
Object.defineProperty(exports, "MultiplayerSystem", { enumerable: true, get: function () { return multiplayer_system_1.MultiplayerSystem; } });
// ========================================================================
// AAA SYSTEMS - ADVANCED GAME AI
// ========================================================================
var advanced_game_ai_engine_1 = require("./game-ai/advanced-game-ai-engine");
Object.defineProperty(exports, "AdvancedGameAIEngine", { enumerable: true, get: function () { return advanced_game_ai_engine_1.GameAIEngine; } });
Object.defineProperty(exports, "GOAPPlanner", { enumerable: true, get: function () { return advanced_game_ai_engine_1.GOAPPlanner; } });
Object.defineProperty(exports, "UtilityAISystem", { enumerable: true, get: function () { return advanced_game_ai_engine_1.UtilityAISystem; } });
Object.defineProperty(exports, "AIAgent", { enumerable: true, get: function () { return advanced_game_ai_engine_1.AIAgent; } });
Object.defineProperty(exports, "SquadAISystem", { enumerable: true, get: function () { return advanced_game_ai_engine_1.SquadAISystem; } });
Object.defineProperty(exports, "AILLMIntegration", { enumerable: true, get: function () { return advanced_game_ai_engine_1.AILLMIntegration; } });
// ========================================================================
// AAA SYSTEMS - PROCEDURAL GENERATION
// ========================================================================
var procedural_generation_engine_1 = require("./procedural/procedural-generation-engine");
Object.defineProperty(exports, "ProceduralGenerationEngine", { enumerable: true, get: function () { return procedural_generation_engine_1.ProceduralGenerationEngine; } });
// ========================================================================
// AAA SYSTEMS - ADVANCED INPUT
// ========================================================================
var advanced_input_system_1 = require("./input/advanced-input-system");
Object.defineProperty(exports, "AdvancedInputSystem", { enumerable: true, get: function () { return advanced_input_system_1.AdvancedInputSystem; } });
// ========================================================================
// AAA SYSTEMS - AI COPILOT
// ========================================================================
var aethel_copilot_1 = require("./copilot/aethel-copilot");
Object.defineProperty(exports, "AethelCopilot", { enumerable: true, get: function () { return aethel_copilot_1.AethelCopilot; } });
// ========================================================================
// AAA SYSTEMS - NATIVE BRIDGE
// ========================================================================
var native_bridge_1 = require("./native/native-bridge");
Object.defineProperty(exports, "NativeBridge", { enumerable: true, get: function () { return native_bridge_1.NativeBridge; } });
// ========================================================================
// AAA SYSTEMS - ENGINE FACADE
// ========================================================================
var aethel_engine_facade_1 = require("./engine/aethel-engine-facade");
Object.defineProperty(exports, "AethelEngine", { enumerable: true, get: function () { return aethel_engine_facade_1.AethelEngine; } });
Object.defineProperty(exports, "createAethelEngine", { enumerable: true, get: function () { return aethel_engine_facade_1.createAethelEngine; } });
Object.defineProperty(exports, "ENGINE_SYMBOLS", { enumerable: true, get: function () { return aethel_engine_facade_1.ENGINE_SYMBOLS; } });
// ========================================================================
// AAA SYSTEMS INDEX
// ========================================================================
var aaa_systems_index_1 = require("./aaa-systems-index");
Object.defineProperty(exports, "AAA_TYPES", { enumerable: true, get: function () { return aaa_systems_index_1.AAA_TYPES; } });
Object.defineProperty(exports, "AAASystemsContainerModule", { enumerable: true, get: function () { return aaa_systems_index_1.AAASystemsContainerModule; } });
Object.defineProperty(exports, "createAAAContainer", { enumerable: true, get: function () { return aaa_systems_index_1.createAAAContainer; } });
Object.defineProperty(exports, "initializeAAASystems", { enumerable: true, get: function () { return aaa_systems_index_1.initializeAAASystems; } });
Object.defineProperty(exports, "disposeAAASystems", { enumerable: true, get: function () { return aaa_systems_index_1.disposeAAASystems; } });
Object.defineProperty(exports, "quickStartAAA", { enumerable: true, get: function () { return aaa_systems_index_1.quickStartAAA; } });
Object.defineProperty(exports, "getAAASsystemsHealth", { enumerable: true, get: function () { return aaa_systems_index_1.getAAASsystemsHealth; } });
// ========================================================================
// TESTING SYSTEM
// ========================================================================
var test_runner_system_1 = require("./testing/test-runner-system");
// Test Runner
Object.defineProperty(exports, "TestRunner", { enumerable: true, get: function () { return test_runner_system_1.TestRunner; } });
Object.defineProperty(exports, "TestReporter", { enumerable: true, get: function () { return test_runner_system_1.TestReporter; } });
Object.defineProperty(exports, "TestWatcher", { enumerable: true, get: function () { return test_runner_system_1.TestWatcher; } });
Object.defineProperty(exports, "TestCoverage", { enumerable: true, get: function () { return test_runner_system_1.TestCoverage; } });
Object.defineProperty(exports, "TestSystem", { enumerable: true, get: function () { return test_runner_system_1.TestSystem; } });
// Test Building
Object.defineProperty(exports, "TestSuiteBuilder", { enumerable: true, get: function () { return test_runner_system_1.TestSuiteBuilder; } });
Object.defineProperty(exports, "TestContext", { enumerable: true, get: function () { return test_runner_system_1.TestContext; } });
// Assertions
Object.defineProperty(exports, "Expect", { enumerable: true, get: function () { return test_runner_system_1.Expect; } });
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_runner_system_1.expect; } });
// Mocking
Object.defineProperty(exports, "createMock", { enumerable: true, get: function () { return test_runner_system_1.createMock; } });
Object.defineProperty(exports, "spyOn", { enumerable: true, get: function () { return test_runner_system_1.spyOn; } });
// Quick Start
Object.defineProperty(exports, "createTestSystem", { enumerable: true, get: function () { return test_runner_system_1.createTestSystem; } });
Object.defineProperty(exports, "describe", { enumerable: true, get: function () { return test_runner_system_1.describe; } });
// Errors
Object.defineProperty(exports, "SkipTestError", { enumerable: true, get: function () { return test_runner_system_1.SkipTestError; } });
Object.defineProperty(exports, "TimeoutTestError", { enumerable: true, get: function () { return test_runner_system_1.TimeoutTestError; } });
// DI
Object.defineProperty(exports, "TEST_TYPES", { enumerable: true, get: function () { return test_runner_system_1.TEST_TYPES; } });
Object.defineProperty(exports, "TestingContainerModule", { enumerable: true, get: function () { return test_runner_system_1.TestingContainerModule; } });
// Module Info
Object.defineProperty(exports, "TestingModuleInfo", { enumerable: true, get: function () { return test_runner_system_1.TestingModuleInfo; } });
// ========================================================================
// ERROR HANDLING SYSTEM
// ========================================================================
var error_handling_system_1 = require("./errors/error-handling-system");
// Enums
Object.defineProperty(exports, "ErrorSeverity", { enumerable: true, get: function () { return error_handling_system_1.ErrorSeverity; } });
Object.defineProperty(exports, "ErrorCategory", { enumerable: true, get: function () { return error_handling_system_1.ErrorCategory; } });
Object.defineProperty(exports, "RecoveryStrategy", { enumerable: true, get: function () { return error_handling_system_1.RecoveryStrategy; } });
Object.defineProperty(exports, "CircuitState", { enumerable: true, get: function () { return error_handling_system_1.CircuitState; } });
// Error Classes
Object.defineProperty(exports, "AethelError", { enumerable: true, get: function () { return error_handling_system_1.AethelError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return error_handling_system_1.NetworkError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return error_handling_system_1.ValidationError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return error_handling_system_1.AuthenticationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return error_handling_system_1.NotFoundError; } });
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return error_handling_system_1.TimeoutError; } });
Object.defineProperty(exports, "ConfigurationError", { enumerable: true, get: function () { return error_handling_system_1.ConfigurationError; } });
// Result & Option Types
Object.defineProperty(exports, "Result", { enumerable: true, get: function () { return error_handling_system_1.Result; } });
Object.defineProperty(exports, "Option", { enumerable: true, get: function () { return error_handling_system_1.Option; } });
// Services
Object.defineProperty(exports, "ErrorHandler", { enumerable: true, get: function () { return error_handling_system_1.ErrorHandler; } });
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return error_handling_system_1.CircuitBreaker; } });
Object.defineProperty(exports, "ErrorBoundary", { enumerable: true, get: function () { return error_handling_system_1.ErrorBoundary; } });
Object.defineProperty(exports, "ErrorHandlerSymbol", { enumerable: true, get: function () { return error_handling_system_1.ErrorHandlerSymbol; } });
// Utilities
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return error_handling_system_1.assert; } });
Object.defineProperty(exports, "assertDefined", { enumerable: true, get: function () { return error_handling_system_1.assertDefined; } });
Object.defineProperty(exports, "safeJsonParse", { enumerable: true, get: function () { return error_handling_system_1.safeJsonParse; } });
Object.defineProperty(exports, "withTimeout", { enumerable: true, get: function () { return error_handling_system_1.withTimeout; } });
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return error_handling_system_1.errorHandler; } });
// ========================================================================
// UX ENHANCEMENT SYSTEM
// ========================================================================
var ux_enhancement_system_1 = require("./ux/ux-enhancement-system");
// Enums
Object.defineProperty(exports, "ToastType", { enumerable: true, get: function () { return ux_enhancement_system_1.ToastType; } });
Object.defineProperty(exports, "ProgressType", { enumerable: true, get: function () { return ux_enhancement_system_1.ProgressType; } });
Object.defineProperty(exports, "Easing", { enumerable: true, get: function () { return ux_enhancement_system_1.Easing; } });
Object.defineProperty(exports, "FeedbackType", { enumerable: true, get: function () { return ux_enhancement_system_1.FeedbackType; } });
Object.defineProperty(exports, "Breakpoint", { enumerable: true, get: function () { return ux_enhancement_system_1.Breakpoint; } });
// Toast System
Object.defineProperty(exports, "ToastManager", { enumerable: true, get: function () { return ux_enhancement_system_1.ToastManager; } });
Object.defineProperty(exports, "ToastManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.ToastManagerSymbol; } });
// Progress System
Object.defineProperty(exports, "ProgressManager", { enumerable: true, get: function () { return ux_enhancement_system_1.ProgressManager; } });
Object.defineProperty(exports, "ProgressManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.ProgressManagerSymbol; } });
// Feedback System
Object.defineProperty(exports, "FeedbackSystem", { enumerable: true, get: function () { return ux_enhancement_system_1.FeedbackSystem; } });
Object.defineProperty(exports, "FeedbackSystemSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.FeedbackSystemSymbol; } });
// Keybinding System
Object.defineProperty(exports, "KeybindingManager", { enumerable: true, get: function () { return ux_enhancement_system_1.KeybindingManager; } });
Object.defineProperty(exports, "KeybindingManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.KeybindingManagerSymbol; } });
// Onboarding System
Object.defineProperty(exports, "OnboardingManager", { enumerable: true, get: function () { return ux_enhancement_system_1.OnboardingManager; } });
Object.defineProperty(exports, "OnboardingManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.OnboardingManagerSymbol; } });
// Accessibility System
Object.defineProperty(exports, "AccessibilityManager", { enumerable: true, get: function () { return ux_enhancement_system_1.AccessibilityManager; } });
Object.defineProperty(exports, "AccessibilityManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.AccessibilityManagerSymbol; } });
// Responsive System
Object.defineProperty(exports, "ResponsiveManager", { enumerable: true, get: function () { return ux_enhancement_system_1.ResponsiveManager; } });
Object.defineProperty(exports, "ResponsiveManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.ResponsiveManagerSymbol; } });
// Animation Utilities
Object.defineProperty(exports, "AnimationHelper", { enumerable: true, get: function () { return ux_enhancement_system_1.AnimationHelper; } });
// ========================================================================
// IDE TOOLKIT SYSTEM
// ========================================================================
var ide_toolkit_1 = require("./toolkit/ide-toolkit");
// Document Management
Object.defineProperty(exports, "DocumentManager", { enumerable: true, get: function () { return ide_toolkit_1.DocumentManager; } });
Object.defineProperty(exports, "DocumentManagerSymbol", { enumerable: true, get: function () { return ide_toolkit_1.DocumentManagerSymbol; } });
// Command System
Object.defineProperty(exports, "CommandRegistry", { enumerable: true, get: function () { return ide_toolkit_1.CommandRegistry; } });
Object.defineProperty(exports, "CommandRegistrySymbol", { enumerable: true, get: function () { return ide_toolkit_1.CommandRegistrySymbol; } });
// UI Services
Object.defineProperty(exports, "QuickPickService", { enumerable: true, get: function () { return ide_toolkit_1.QuickPickService; } });
Object.defineProperty(exports, "QuickPickServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.QuickPickServiceSymbol; } });
Object.defineProperty(exports, "InputBoxService", { enumerable: true, get: function () { return ide_toolkit_1.InputBoxService; } });
Object.defineProperty(exports, "InputBoxServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.InputBoxServiceSymbol; } });
Object.defineProperty(exports, "StatusBarService", { enumerable: true, get: function () { return ide_toolkit_1.StatusBarService; } });
Object.defineProperty(exports, "StatusBarServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.StatusBarServiceSymbol; } });
Object.defineProperty(exports, "PanelManager", { enumerable: true, get: function () { return ide_toolkit_1.PanelManager; } });
Object.defineProperty(exports, "PanelManagerSymbol", { enumerable: true, get: function () { return ide_toolkit_1.PanelManagerSymbol; } });
Object.defineProperty(exports, "TreeViewService", { enumerable: true, get: function () { return ide_toolkit_1.TreeViewService; } });
Object.defineProperty(exports, "TreeViewServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.TreeViewServiceSymbol; } });
// Diagnostics
Object.defineProperty(exports, "DiagnosticCollection", { enumerable: true, get: function () { return ide_toolkit_1.DiagnosticCollection; } });
Object.defineProperty(exports, "DiagnosticCollectionSymbol", { enumerable: true, get: function () { return ide_toolkit_1.DiagnosticCollectionSymbol; } });
Object.defineProperty(exports, "DiagnosticSeverity", { enumerable: true, get: function () { return ide_toolkit_1.DiagnosticSeverity; } });
// Configuration
Object.defineProperty(exports, "ConfigurationService", { enumerable: true, get: function () { return ide_toolkit_1.ConfigurationService; } });
Object.defineProperty(exports, "ConfigurationServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.ConfigurationServiceSymbol; } });
// Workspace
Object.defineProperty(exports, "WorkspaceService", { enumerable: true, get: function () { return ide_toolkit_1.WorkspaceService; } });
Object.defineProperty(exports, "WorkspaceServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.WorkspaceServiceSymbol; } });
// Unified Toolkit
Object.defineProperty(exports, "IDEToolkit", { enumerable: true, get: function () { return ide_toolkit_1.IDEToolkit; } });
Object.defineProperty(exports, "createIDEToolkit", { enumerable: true, get: function () { return ide_toolkit_1.createIDEToolkit; } });
Object.defineProperty(exports, "createIDEToolkitContainer", { enumerable: true, get: function () { return ide_toolkit_1.createIDEToolkitContainer; } });
// DI
Object.defineProperty(exports, "IDE_TOOLKIT_TYPES", { enumerable: true, get: function () { return ide_toolkit_1.IDE_TOOLKIT_TYPES; } });
Object.defineProperty(exports, "IDEToolkitContainerModule", { enumerable: true, get: function () { return ide_toolkit_1.IDEToolkitContainerModule; } });
// ========================================================================
// IDE EXPERIENCE INDEX (UNIFIED)
// ========================================================================
var ide_experience_index_1 = require("./experience/ide-experience-index");
// Unified Types
Object.defineProperty(exports, "IDE_EXPERIENCE_TYPES", { enumerable: true, get: function () { return ide_experience_index_1.IDE_EXPERIENCE_TYPES; } });
// Unified Container Module
Object.defineProperty(exports, "IDEExperienceContainerModule", { enumerable: true, get: function () { return ide_experience_index_1.IDEExperienceContainerModule; } });
// Unified Experience Class
Object.defineProperty(exports, "IDEExperience", { enumerable: true, get: function () { return ide_experience_index_1.IDEExperience; } });
// Quick Start Function
Object.defineProperty(exports, "quickStartIDEExperience", { enumerable: true, get: function () { return ide_experience_index_1.quickStartIDEExperience; } });
// Default Configurations
Object.defineProperty(exports, "DEFAULT_KEYBINDINGS", { enumerable: true, get: function () { return ide_experience_index_1.DEFAULT_KEYBINDINGS; } });
Object.defineProperty(exports, "DEFAULT_ONBOARDING_STEPS", { enumerable: true, get: function () { return ide_experience_index_1.DEFAULT_ONBOARDING_STEPS; } });
// Module Info
Object.defineProperty(exports, "IDEExperienceModuleInfo", { enumerable: true, get: function () { return ide_experience_index_1.IDEExperienceModuleInfo; } });
// Initialization
Object.defineProperty(exports, "initializeIDEExperience", { enumerable: true, get: function () { return ide_experience_index_1.initializeIDEExperience; } });
// ========================================================================
// VERSION INFO
// ========================================================================
exports.AETHEL_VERSION = '2.3.0';
exports.AETHEL_BUILD_DATE = new Date().toISOString();
exports.AETHEL_MODULES = [
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
];
