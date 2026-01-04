"use strict";
/**
 * Aethel IDE - Systems Module Index
 *
 * Central export file for all IDE systems.
 * Provides unified imports and container bindings.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemsContainerModule = exports.TYPES = exports.Automation = exports.AssetGeneration = exports.AIIntegration = exports.Assets = exports.Project = exports.Effects = exports.Preview = exports.ExportPipelineExports = exports.Plugins = exports.Collaboration = exports.WebSocket = exports.Vector = exports.Text = exports.Image = exports.Video = exports.Scene3D = exports.Audio = exports.VisualScripting = exports.GameAI = exports.RenderPipeline = exports.RenderWebGPU = exports.Physics = exports.Engine = exports.BridgeSystem = exports.TaskSystem = exports.SnippetSystemExports = exports.TemplateSystemExports = exports.ExtensionSystem = exports.DebugSystem = void 0;
exports.initializeAllSystems = initializeAllSystems;
exports.disposeAllSystems = disposeAllSystems;
exports.getAllSystemsStatus = getAllSystemsStatus;
// ==================== Debug System ====================
exports.DebugSystem = __importStar(require("./debug/debugger-system"));
// ==================== Extension System ====================
exports.ExtensionSystem = __importStar(require("./extensions/extension-marketplace-system"));
// ==================== Template System ====================
exports.TemplateSystemExports = __importStar(require("./templates/template-system"));
// ==================== Snippet System ====================
exports.SnippetSystemExports = __importStar(require("./snippets/snippet-system"));
// ==================== Task System ====================
exports.TaskSystem = __importStar(require("./tasks/task-runner-system"));
// ==================== Bridge System ====================
exports.BridgeSystem = __importStar(require("./bridge/unified-service-bridge"));
// ==================== Engine Systems ====================
exports.Engine = __importStar(require("./engine"));
exports.Physics = __importStar(require("./physics/physics-engine"));
exports.RenderWebGPU = __importStar(require("./render/webgpu-renderer"));
exports.RenderPipeline = __importStar(require("./render/unified-render-pipeline"));
exports.GameAI = __importStar(require("./game-ai/game-ai-engine"));
exports.VisualScripting = __importStar(require("./visual-scripting/visual-scripting-engine"));
exports.Audio = __importStar(require("./audio/audio-processing-engine"));
exports.Scene3D = __importStar(require("./3d/scene-3d-engine"));
exports.Video = __importStar(require("./video/video-timeline-engine"));
exports.Image = __importStar(require("./image/image-layer-engine"));
exports.Text = __importStar(require("./text/text-typography-engine"));
exports.Vector = __importStar(require("./vector/vector-processing-engine"));
exports.WebSocket = __importStar(require("./websocket/websocket-service"));
exports.Collaboration = __importStar(require("./collaboration/collaboration-engine"));
exports.Plugins = __importStar(require("./plugins/plugin-system"));
exports.ExportPipelineExports = __importStar(require("./export/export-pipeline"));
exports.Preview = __importStar(require("./preview/preview-engine"));
exports.Effects = __importStar(require("./effects/effects-library"));
exports.Project = __importStar(require("./project/project-manager"));
exports.Assets = __importStar(require("./assets/asset-manager"));
exports.AIIntegration = __importStar(require("./ai/ai-integration-layer"));
exports.AssetGeneration = __importStar(require("./ai/asset-generation-ai"));
exports.Automation = __importStar(require("./automation/workflow-automation-engine"));
// ==================== Container Bindings ====================
const inversify_1 = require("inversify");
const debugger_system_1 = require("./debug/debugger-system");
const extension_marketplace_system_1 = require("./extensions/extension-marketplace-system");
const template_system_1 = require("./templates/template-system");
const snippet_system_1 = require("./snippets/snippet-system");
const task_runner_system_1 = require("./tasks/task-runner-system");
const unified_service_bridge_1 = require("./bridge/unified-service-bridge");
// Engine imports
const engine_1 = require("./engine");
const physics_engine_1 = require("./physics/physics-engine");
const webgpu_renderer_1 = require("./render/webgpu-renderer");
const unified_render_pipeline_1 = require("./render/unified-render-pipeline");
const game_ai_engine_1 = require("./game-ai/game-ai-engine");
const visual_scripting_engine_1 = require("./visual-scripting/visual-scripting-engine");
const audio_processing_engine_1 = require("./audio/audio-processing-engine");
const scene_3d_engine_1 = require("./3d/scene-3d-engine");
const video_timeline_engine_1 = require("./video/video-timeline-engine");
const image_layer_engine_1 = require("./image/image-layer-engine");
const text_typography_engine_1 = require("./text/text-typography-engine");
const vector_processing_engine_1 = require("./vector/vector-processing-engine");
const websocket_service_1 = require("./websocket/websocket-service");
const collaboration_engine_1 = require("./collaboration/collaboration-engine");
const plugin_system_1 = require("./plugins/plugin-system");
const export_pipeline_1 = require("./export/export-pipeline");
const preview_engine_1 = require("./preview/preview-engine");
const effects_library_1 = require("./effects/effects-library");
const project_manager_1 = require("./project/project-manager");
const asset_manager_1 = require("./assets/asset-manager");
const ai_integration_layer_1 = require("./ai/ai-integration-layer");
const asset_generation_ai_1 = require("./ai/asset-generation-ai");
const workflow_automation_engine_1 = require("./automation/workflow-automation-engine");
/**
 * Symbol identifiers for injection
 */
exports.TYPES = {
    // Core Systems
    DebuggerSystem: Symbol.for('DebuggerSystem'),
    ExtensionMarketplaceSystem: Symbol.for('ExtensionMarketplaceSystem'),
    TemplateSystem: Symbol.for('TemplateSystem'),
    SnippetSystem: Symbol.for('SnippetSystem'),
    TaskRunnerSystem: Symbol.for('TaskRunnerSystem'),
    // Bridge
    UnifiedServiceBridge: Symbol.for('UnifiedServiceBridge'),
    // Engine Core
    AethelEngineRuntime: Symbol.for('AethelEngineRuntime'),
    PhysicsSubsystem: Symbol.for('PhysicsSubsystem'),
    RenderSubsystem: Symbol.for('RenderSubsystem'),
    // Physics & Rendering
    PhysicsEngine: Symbol.for('PhysicsEngine'),
    WebGPURenderer: Symbol.for('WebGPURenderer'),
    UnifiedRenderPipeline: Symbol.for('UnifiedRenderPipeline'),
    // Game AI
    BehaviorTreeEngine: Symbol.for('BehaviorTreeEngine'),
    PerceptionSystem: Symbol.for('PerceptionSystem'),
    NavMeshSystem: Symbol.for('NavMeshSystem'),
    // Visual & Audio
    VisualScriptingEngine: Symbol.for('VisualScriptingEngine'),
    AudioProcessingEngine: Symbol.for('AudioProcessingEngine'),
    Scene3DEngine: Symbol.for('Scene3DEngine'),
    VideoTimelineEngine: Symbol.for('VideoTimelineEngine'),
    ImageLayerEngine: Symbol.for('ImageLayerEngine'),
    TextTypographyEngine: Symbol.for('TextTypographyEngine'),
    VectorProcessingEngine: Symbol.for('VectorProcessingEngine'),
    // Networking & Collaboration
    WebSocketService: Symbol.for('WebSocketService'),
    CollaborationEngine: Symbol.for('CollaborationEngine'),
    // Project & Assets
    PluginSystem: Symbol.for('PluginSystem'),
    ExportPipeline: Symbol.for('ExportPipeline'),
    PreviewEngine: Symbol.for('PreviewEngine'),
    EffectsLibrary: Symbol.for('EffectsLibrary'),
    ProjectManager: Symbol.for('ProjectManager'),
    AssetManager: Symbol.for('AssetManager'),
    // AI
    AIIntegrationLayer: Symbol.for('AIIntegrationLayer'),
    AssetGenerationAI: Symbol.for('AssetGenerationAI'),
    // Automation
    WorkflowAutomationEngine: Symbol.for('WorkflowAutomationEngine'),
    // Legacy references
    CommandPaletteSystem: Symbol.for('CommandPaletteSystem'),
    KeybindingSystem: Symbol.for('KeybindingSystem'),
    NotificationSystem: Symbol.for('NotificationSystem'),
    HistorySystem: Symbol.for('HistorySystem'),
    SearchSystem: Symbol.for('SearchSystem'),
    BackupRecoverySystem: Symbol.for('BackupRecoverySystem'),
    LocalizationSystem: Symbol.for('LocalizationSystem'),
    AccessibilitySystem: Symbol.for('AccessibilitySystem'),
    PerformanceMonitorSystem: Symbol.for('PerformanceMonitorSystem'),
    ThemeSystem: Symbol.for('ThemeSystem')
};
/**
 * Container module with all system bindings
 */
exports.SystemsContainerModule = new inversify_1.ContainerModule((bind) => {
    // ========== Core IDE Systems ==========
    bind(exports.TYPES.DebuggerSystem)
        .to(debugger_system_1.DebuggerSystem)
        .inSingletonScope();
    bind(exports.TYPES.ExtensionMarketplaceSystem)
        .to(extension_marketplace_system_1.ExtensionMarketplaceSystem)
        .inSingletonScope();
    bind(exports.TYPES.TemplateSystem)
        .to(template_system_1.TemplateSystem)
        .inSingletonScope();
    bind(exports.TYPES.SnippetSystem)
        .to(snippet_system_1.SnippetSystem)
        .inSingletonScope();
    bind(exports.TYPES.TaskRunnerSystem)
        .to(task_runner_system_1.TaskRunnerSystem)
        .inSingletonScope();
    bind(exports.TYPES.UnifiedServiceBridge)
        .to(unified_service_bridge_1.UnifiedServiceBridge)
        .inSingletonScope();
    // ========== Engine Core ==========
    bind(exports.TYPES.AethelEngineRuntime)
        .to(engine_1.AethelEngineRuntime)
        .inSingletonScope();
    bind(exports.TYPES.PhysicsSubsystem)
        .to(engine_1.PhysicsSubsystem)
        .inSingletonScope();
    bind(exports.TYPES.RenderSubsystem)
        .to(engine_1.RenderSubsystem)
        .inSingletonScope();
    // ========== Physics & Rendering ==========
    bind(exports.TYPES.PhysicsEngine)
        .to(physics_engine_1.PhysicsEngine)
        .inSingletonScope();
    bind(exports.TYPES.WebGPURenderer)
        .to(webgpu_renderer_1.WebGPURenderer)
        .inSingletonScope();
    bind(exports.TYPES.UnifiedRenderPipeline)
        .to(unified_render_pipeline_1.UnifiedRenderPipeline)
        .inSingletonScope();
    // ========== Game AI ==========
    bind(exports.TYPES.BehaviorTreeEngine)
        .to(game_ai_engine_1.BehaviorTreeEngine)
        .inSingletonScope();
    bind(exports.TYPES.PerceptionSystem)
        .to(game_ai_engine_1.PerceptionSystem)
        .inSingletonScope();
    bind(exports.TYPES.NavMeshSystem)
        .to(game_ai_engine_1.NavMeshSystem)
        .inSingletonScope();
    // ========== Visual & Audio ==========
    bind(exports.TYPES.VisualScriptingEngine)
        .to(visual_scripting_engine_1.VisualScriptingEngine)
        .inSingletonScope();
    bind(exports.TYPES.AudioProcessingEngine)
        .to(audio_processing_engine_1.AudioProcessingEngine)
        .inSingletonScope();
    bind(exports.TYPES.Scene3DEngine)
        .to(scene_3d_engine_1.Scene3DEngine)
        .inSingletonScope();
    bind(exports.TYPES.VideoTimelineEngine)
        .to(video_timeline_engine_1.VideoTimelineEngine)
        .inSingletonScope();
    bind(exports.TYPES.ImageLayerEngine)
        .to(image_layer_engine_1.ImageLayerEngine)
        .inSingletonScope();
    bind(exports.TYPES.TextTypographyEngine)
        .to(text_typography_engine_1.TextTypographyEngine)
        .inSingletonScope();
    bind(exports.TYPES.VectorProcessingEngine)
        .to(vector_processing_engine_1.VectorProcessingEngine)
        .inSingletonScope();
    // ========== Networking & Collaboration ==========
    bind(exports.TYPES.WebSocketService)
        .to(websocket_service_1.WebSocketService)
        .inSingletonScope();
    bind(exports.TYPES.CollaborationEngine)
        .to(collaboration_engine_1.CollaborationEngine)
        .inSingletonScope();
    // ========== Project & Assets ==========
    bind(exports.TYPES.PluginSystem)
        .to(plugin_system_1.PluginSystem)
        .inSingletonScope();
    bind(exports.TYPES.ExportPipeline)
        .to(export_pipeline_1.ExportPipeline)
        .inSingletonScope();
    bind(exports.TYPES.PreviewEngine)
        .to(preview_engine_1.PreviewEngine)
        .inSingletonScope();
    bind(exports.TYPES.EffectsLibrary)
        .to(effects_library_1.EffectsLibrary)
        .inSingletonScope();
    bind(exports.TYPES.ProjectManager)
        .to(project_manager_1.ProjectManager)
        .inSingletonScope();
    bind(exports.TYPES.AssetManager)
        .to(asset_manager_1.AssetManager)
        .inSingletonScope();
    // ========== AI Systems ==========
    bind(exports.TYPES.AIIntegrationLayer)
        .to(ai_integration_layer_1.AIIntegrationLayer)
        .inSingletonScope();
    bind(exports.TYPES.AssetGenerationAI)
        .to(asset_generation_ai_1.AssetGenerationAI)
        .inSingletonScope();
    // ========== Automation ==========
    bind(exports.TYPES.WorkflowAutomationEngine)
        .to(workflow_automation_engine_1.WorkflowAutomationEngine)
        .inSingletonScope();
});
/**
 * Initialize all systems in proper order
 */
async function initializeAllSystems(container) {
    console.log('[Aethel IDE] Initializing all systems...');
    // Get system instances
    const debuggerSystem = container.get(exports.TYPES.DebuggerSystem);
    const extensions = container.get(exports.TYPES.ExtensionMarketplaceSystem);
    const templates = container.get(exports.TYPES.TemplateSystem);
    const snippets = container.get(exports.TYPES.SnippetSystem);
    const tasks = container.get(exports.TYPES.TaskRunnerSystem);
    const bridge = container.get(exports.TYPES.UnifiedServiceBridge);
    // Initialize each system with its specific config
    try {
        console.log('[Aethel IDE] DebuggerSystem initialized');
        await extensions.initialize({
            extensionsPath: './extensions',
            userExtensionsPath: './user-extensions'
        });
        console.log('[Aethel IDE] ExtensionMarketplace initialized');
        await templates.initialize({
            templatesPath: './templates',
            userTemplatesPath: './user-templates'
        });
        console.log('[Aethel IDE] TemplateSystem initialized');
        await snippets.initialize({
            userSnippetsPath: './user-snippets'
        });
        console.log('[Aethel IDE] SnippetSystem initialized');
        await tasks.initialize({
            workspaceRoot: './'
        });
        console.log('[Aethel IDE] TaskRunnerSystem initialized');
    }
    catch (error) {
        console.error('[Aethel IDE] Failed to initialize system:', error);
        throw error;
    }
    // Initialize bridge last (needs other systems)
    await bridge.initialize({
        enableRealtime: true,
        preferredSource: 'theia'
    });
    console.log('[Aethel IDE] UnifiedServiceBridge initialized');
    console.log('[Aethel IDE] All systems initialized successfully');
}
/**
 * Dispose all systems
 */
function disposeAllSystems(container) {
    console.log('[Aethel IDE] Disposing all systems...');
    const systems = [
        exports.TYPES.UnifiedServiceBridge,
        exports.TYPES.TaskRunnerSystem,
        exports.TYPES.SnippetSystem,
        exports.TYPES.TemplateSystem,
        exports.TYPES.ExtensionMarketplaceSystem,
        exports.TYPES.DebuggerSystem
    ];
    for (const type of systems) {
        try {
            const system = container.get(type);
            if (system.dispose) {
                system.dispose();
            }
        }
        catch (error) {
            console.error(`[Aethel IDE] Error disposing system:`, error);
        }
    }
    console.log('[Aethel IDE] All systems disposed');
}
/**
 * Get status of all systems
 */
function getAllSystemsStatus(container) {
    const statuses = [];
    const systemsToCheck = [
        { type: exports.TYPES.DebuggerSystem, name: 'DebuggerSystem' },
        { type: exports.TYPES.ExtensionMarketplaceSystem, name: 'ExtensionMarketplace' },
        { type: exports.TYPES.TemplateSystem, name: 'TemplateSystem' },
        { type: exports.TYPES.SnippetSystem, name: 'SnippetSystem' },
        { type: exports.TYPES.TaskRunnerSystem, name: 'TaskRunnerSystem' },
        { type: exports.TYPES.UnifiedServiceBridge, name: 'UnifiedServiceBridge' }
    ];
    for (const { type, name } of systemsToCheck) {
        try {
            const system = container.get(type);
            statuses.push({
                name,
                initialized: system !== null,
                healthy: true
            });
        }
        catch {
            statuses.push({
                name,
                initialized: false,
                healthy: false
            });
        }
    }
    return statuses;
}
// ==================== Default Export ====================
exports.default = {
    TYPES: exports.TYPES,
    SystemsContainerModule: exports.SystemsContainerModule,
    initializeAllSystems,
    disposeAllSystems,
    getAllSystemsStatus
};
