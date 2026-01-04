/**
 * Aethel IDE - Systems Module Index
 * 
 * Central export file for all IDE systems.
 * Provides unified imports and container bindings.
 */

// ==================== Debug System ====================
export * as DebugSystem from './debug/debugger-system';

// ==================== Extension System ====================
export * as ExtensionSystem from './extensions/extension-marketplace-system';

// ==================== Template System ====================
export * as TemplateSystemExports from './templates/template-system';

// ==================== Snippet System ====================
export * as SnippetSystemExports from './snippets/snippet-system';

// ==================== Task System ====================
export * as TaskSystem from './tasks/task-runner-system';

// ==================== Bridge System ====================
export * as BridgeSystem from './bridge/unified-service-bridge';

// ==================== Engine Systems ====================
export * as Engine from './engine';
export * as Physics from './physics/physics-engine';
export * as RenderWebGPU from './render/webgpu-renderer';
export * as RenderPipeline from './render/unified-render-pipeline';
export * as GameAI from './game-ai/game-ai-engine';
export * as VisualScripting from './visual-scripting/visual-scripting-engine';
export * as Audio from './audio/audio-processing-engine';
export * as Scene3D from './3d/scene-3d-engine';
export * as Video from './video/video-timeline-engine';
export * as Image from './image/image-layer-engine';
export * as Text from './text/text-typography-engine';
export * as Vector from './vector/vector-processing-engine';
export * as WebSocket from './websocket/websocket-service';
export * as Collaboration from './collaboration/collaboration-engine';
export * as Plugins from './plugins/plugin-system';
export * as ExportPipelineExports from './export/export-pipeline';
export * as Preview from './preview/preview-engine';
export * as Effects from './effects/effects-library';
export * as Project from './project/project-manager';
export * as Assets from './assets/asset-manager';
export * as AIIntegration from './ai/ai-integration-layer';
export * as AssetGeneration from './ai/asset-generation-ai';
export * as Automation from './automation/workflow-automation-engine';

// ==================== Container Bindings ====================

import { Container, ContainerModule, interfaces } from 'inversify';
import { DebuggerSystem } from './debug/debugger-system';
import { ExtensionMarketplaceSystem } from './extensions/extension-marketplace-system';
import { TemplateSystem } from './templates/template-system';
import { SnippetSystem } from './snippets/snippet-system';
import { TaskRunnerSystem } from './tasks/task-runner-system';
import { UnifiedServiceBridge } from './bridge/unified-service-bridge';

// Engine imports
import { AethelEngineRuntime, PhysicsSubsystem, RenderSubsystem } from './engine';
import { PhysicsEngine } from './physics/physics-engine';
import { WebGPURenderer } from './render/webgpu-renderer';
import { UnifiedRenderPipeline } from './render/unified-render-pipeline';
import { BehaviorTreeEngine, PerceptionSystem, NavMeshSystem } from './game-ai/game-ai-engine';
import { VisualScriptingEngine } from './visual-scripting/visual-scripting-engine';
import { AudioProcessingEngine } from './audio/audio-processing-engine';
import { Scene3DEngine } from './3d/scene-3d-engine';
import { VideoTimelineEngine } from './video/video-timeline-engine';
import { ImageLayerEngine } from './image/image-layer-engine';
import { TextTypographyEngine } from './text/text-typography-engine';
import { VectorProcessingEngine } from './vector/vector-processing-engine';
import { WebSocketService } from './websocket/websocket-service';
import { CollaborationEngine } from './collaboration/collaboration-engine';
import { PluginSystem } from './plugins/plugin-system';
import { ExportPipeline } from './export/export-pipeline';
import { PreviewEngine } from './preview/preview-engine';
import { EffectsLibrary } from './effects/effects-library';
import { ProjectManager } from './project/project-manager';
import { AssetManager } from './assets/asset-manager';
import { AIIntegrationLayer } from './ai/ai-integration-layer';
import { AssetGenerationAI } from './ai/asset-generation-ai';
import { WorkflowAutomationEngine } from './automation/workflow-automation-engine';

/**
 * Symbol identifiers for injection
 */
export const TYPES = {
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
export const SystemsContainerModule = new ContainerModule((bind: interfaces.Bind) => {
    // ========== Core IDE Systems ==========
    bind<DebuggerSystem>(TYPES.DebuggerSystem)
        .to(DebuggerSystem)
        .inSingletonScope();
    
    bind<ExtensionMarketplaceSystem>(TYPES.ExtensionMarketplaceSystem)
        .to(ExtensionMarketplaceSystem)
        .inSingletonScope();
    
    bind<TemplateSystem>(TYPES.TemplateSystem)
        .to(TemplateSystem)
        .inSingletonScope();
    
    bind<SnippetSystem>(TYPES.SnippetSystem)
        .to(SnippetSystem)
        .inSingletonScope();
    
    bind<TaskRunnerSystem>(TYPES.TaskRunnerSystem)
        .to(TaskRunnerSystem)
        .inSingletonScope();
    
    bind<UnifiedServiceBridge>(TYPES.UnifiedServiceBridge)
        .to(UnifiedServiceBridge)
        .inSingletonScope();
    
    // ========== Engine Core ==========
    bind<AethelEngineRuntime>(TYPES.AethelEngineRuntime)
        .to(AethelEngineRuntime)
        .inSingletonScope();
    
    bind<PhysicsSubsystem>(TYPES.PhysicsSubsystem)
        .to(PhysicsSubsystem)
        .inSingletonScope();
    
    bind<RenderSubsystem>(TYPES.RenderSubsystem)
        .to(RenderSubsystem)
        .inSingletonScope();
    
    // ========== Physics & Rendering ==========
    bind<PhysicsEngine>(TYPES.PhysicsEngine)
        .to(PhysicsEngine)
        .inSingletonScope();
    
    bind<WebGPURenderer>(TYPES.WebGPURenderer)
        .to(WebGPURenderer)
        .inSingletonScope();
    
    bind<UnifiedRenderPipeline>(TYPES.UnifiedRenderPipeline)
        .to(UnifiedRenderPipeline)
        .inSingletonScope();
    
    // ========== Game AI ==========
    bind<BehaviorTreeEngine>(TYPES.BehaviorTreeEngine)
        .to(BehaviorTreeEngine)
        .inSingletonScope();
    
    bind<PerceptionSystem>(TYPES.PerceptionSystem)
        .to(PerceptionSystem)
        .inSingletonScope();
    
    bind<NavMeshSystem>(TYPES.NavMeshSystem)
        .to(NavMeshSystem)
        .inSingletonScope();
    
    // ========== Visual & Audio ==========
    bind<VisualScriptingEngine>(TYPES.VisualScriptingEngine)
        .to(VisualScriptingEngine)
        .inSingletonScope();
    
    bind<AudioProcessingEngine>(TYPES.AudioProcessingEngine)
        .to(AudioProcessingEngine)
        .inSingletonScope();
    
    bind<Scene3DEngine>(TYPES.Scene3DEngine)
        .to(Scene3DEngine)
        .inSingletonScope();
    
    bind<VideoTimelineEngine>(TYPES.VideoTimelineEngine)
        .to(VideoTimelineEngine)
        .inSingletonScope();
    
    bind<ImageLayerEngine>(TYPES.ImageLayerEngine)
        .to(ImageLayerEngine)
        .inSingletonScope();
    
    bind<TextTypographyEngine>(TYPES.TextTypographyEngine)
        .to(TextTypographyEngine)
        .inSingletonScope();
    
    bind<VectorProcessingEngine>(TYPES.VectorProcessingEngine)
        .to(VectorProcessingEngine)
        .inSingletonScope();
    
    // ========== Networking & Collaboration ==========
    bind<WebSocketService>(TYPES.WebSocketService)
        .to(WebSocketService)
        .inSingletonScope();
    
    bind<CollaborationEngine>(TYPES.CollaborationEngine)
        .to(CollaborationEngine)
        .inSingletonScope();
    
    // ========== Project & Assets ==========
    bind<PluginSystem>(TYPES.PluginSystem)
        .to(PluginSystem)
        .inSingletonScope();
    
    bind<ExportPipeline>(TYPES.ExportPipeline)
        .to(ExportPipeline)
        .inSingletonScope();
    
    bind<PreviewEngine>(TYPES.PreviewEngine)
        .to(PreviewEngine)
        .inSingletonScope();
    
    bind<EffectsLibrary>(TYPES.EffectsLibrary)
        .to(EffectsLibrary)
        .inSingletonScope();
    
    bind<ProjectManager>(TYPES.ProjectManager)
        .to(ProjectManager)
        .inSingletonScope();
    
    bind<AssetManager>(TYPES.AssetManager)
        .to(AssetManager)
        .inSingletonScope();
    
    // ========== AI Systems ==========
    bind<AIIntegrationLayer>(TYPES.AIIntegrationLayer)
        .to(AIIntegrationLayer)
        .inSingletonScope();
    
    bind<AssetGenerationAI>(TYPES.AssetGenerationAI)
        .to(AssetGenerationAI)
        .inSingletonScope();
    
    // ========== Automation ==========
    bind<WorkflowAutomationEngine>(TYPES.WorkflowAutomationEngine)
        .to(WorkflowAutomationEngine)
        .inSingletonScope();
});

/**
 * Initialize all systems in proper order
 */
export async function initializeAllSystems(container: Container): Promise<void> {
    console.log('[Aethel IDE] Initializing all systems...');
    
    // Get system instances
    const debuggerSystem = container.get<DebuggerSystem>(TYPES.DebuggerSystem);
    const extensions = container.get<ExtensionMarketplaceSystem>(TYPES.ExtensionMarketplaceSystem);
    const templates = container.get<TemplateSystem>(TYPES.TemplateSystem);
    const snippets = container.get<SnippetSystem>(TYPES.SnippetSystem);
    const tasks = container.get<TaskRunnerSystem>(TYPES.TaskRunnerSystem);
    const bridge = container.get<UnifiedServiceBridge>(TYPES.UnifiedServiceBridge);
    
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
    } catch (error) {
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
export function disposeAllSystems(container: Container): void {
    console.log('[Aethel IDE] Disposing all systems...');
    
    const systems = [
        TYPES.UnifiedServiceBridge,
        TYPES.TaskRunnerSystem,
        TYPES.SnippetSystem,
        TYPES.TemplateSystem,
        TYPES.ExtensionMarketplaceSystem,
        TYPES.DebuggerSystem
    ];
    
    for (const type of systems) {
        try {
            const system = container.get<{ dispose?: () => void }>(type);
            if (system.dispose) {
                system.dispose();
            }
        } catch (error) {
            console.error(`[Aethel IDE] Error disposing system:`, error);
        }
    }
    
    console.log('[Aethel IDE] All systems disposed');
}

// ==================== System Status ====================

/**
 * System status info
 */
export interface SystemStatus {
    name: string;
    initialized: boolean;
    healthy: boolean;
    details?: Record<string, unknown>;
}

/**
 * Get status of all systems
 */
export function getAllSystemsStatus(container: Container): SystemStatus[] {
    const statuses: SystemStatus[] = [];
    
    const systemsToCheck = [
        { type: TYPES.DebuggerSystem, name: 'DebuggerSystem' },
        { type: TYPES.ExtensionMarketplaceSystem, name: 'ExtensionMarketplace' },
        { type: TYPES.TemplateSystem, name: 'TemplateSystem' },
        { type: TYPES.SnippetSystem, name: 'SnippetSystem' },
        { type: TYPES.TaskRunnerSystem, name: 'TaskRunnerSystem' },
        { type: TYPES.UnifiedServiceBridge, name: 'UnifiedServiceBridge' }
    ];
    
    for (const { type, name } of systemsToCheck) {
        try {
            const system = container.get(type);
            statuses.push({
                name,
                initialized: system !== null,
                healthy: true
            });
        } catch {
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

export default {
    TYPES,
    SystemsContainerModule,
    initializeAllSystems,
    disposeAllSystems,
    getAllSystemsStatus
};
