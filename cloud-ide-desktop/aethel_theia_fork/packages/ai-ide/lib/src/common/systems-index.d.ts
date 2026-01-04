/**
 * Aethel IDE - Systems Module Index
 *
 * Central export file for all IDE systems.
 * Provides unified imports and container bindings.
 */
export * as DebugSystem from './debug/debugger-system';
export * as ExtensionSystem from './extensions/extension-marketplace-system';
export * as TemplateSystemExports from './templates/template-system';
export * as SnippetSystemExports from './snippets/snippet-system';
export * as TaskSystem from './tasks/task-runner-system';
export * as BridgeSystem from './bridge/unified-service-bridge';
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
import { Container, ContainerModule } from 'inversify';
/**
 * Symbol identifiers for injection
 */
export declare const TYPES: {
    DebuggerSystem: symbol;
    ExtensionMarketplaceSystem: symbol;
    TemplateSystem: symbol;
    SnippetSystem: symbol;
    TaskRunnerSystem: symbol;
    UnifiedServiceBridge: symbol;
    AethelEngineRuntime: symbol;
    PhysicsSubsystem: symbol;
    RenderSubsystem: symbol;
    PhysicsEngine: symbol;
    WebGPURenderer: symbol;
    UnifiedRenderPipeline: symbol;
    BehaviorTreeEngine: symbol;
    PerceptionSystem: symbol;
    NavMeshSystem: symbol;
    VisualScriptingEngine: symbol;
    AudioProcessingEngine: symbol;
    Scene3DEngine: symbol;
    VideoTimelineEngine: symbol;
    ImageLayerEngine: symbol;
    TextTypographyEngine: symbol;
    VectorProcessingEngine: symbol;
    WebSocketService: symbol;
    CollaborationEngine: symbol;
    PluginSystem: symbol;
    ExportPipeline: symbol;
    PreviewEngine: symbol;
    EffectsLibrary: symbol;
    ProjectManager: symbol;
    AssetManager: symbol;
    AIIntegrationLayer: symbol;
    AssetGenerationAI: symbol;
    WorkflowAutomationEngine: symbol;
    CommandPaletteSystem: symbol;
    KeybindingSystem: symbol;
    NotificationSystem: symbol;
    HistorySystem: symbol;
    SearchSystem: symbol;
    BackupRecoverySystem: symbol;
    LocalizationSystem: symbol;
    AccessibilitySystem: symbol;
    PerformanceMonitorSystem: symbol;
    ThemeSystem: symbol;
};
/**
 * Container module with all system bindings
 */
export declare const SystemsContainerModule: ContainerModule;
/**
 * Initialize all systems in proper order
 */
export declare function initializeAllSystems(container: Container): Promise<void>;
/**
 * Dispose all systems
 */
export declare function disposeAllSystems(container: Container): void;
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
export declare function getAllSystemsStatus(container: Container): SystemStatus[];
declare const _default: {
    TYPES: {
        DebuggerSystem: symbol;
        ExtensionMarketplaceSystem: symbol;
        TemplateSystem: symbol;
        SnippetSystem: symbol;
        TaskRunnerSystem: symbol;
        UnifiedServiceBridge: symbol;
        AethelEngineRuntime: symbol;
        PhysicsSubsystem: symbol;
        RenderSubsystem: symbol;
        PhysicsEngine: symbol;
        WebGPURenderer: symbol;
        UnifiedRenderPipeline: symbol;
        BehaviorTreeEngine: symbol;
        PerceptionSystem: symbol;
        NavMeshSystem: symbol;
        VisualScriptingEngine: symbol;
        AudioProcessingEngine: symbol;
        Scene3DEngine: symbol;
        VideoTimelineEngine: symbol;
        ImageLayerEngine: symbol;
        TextTypographyEngine: symbol;
        VectorProcessingEngine: symbol;
        WebSocketService: symbol;
        CollaborationEngine: symbol;
        PluginSystem: symbol;
        ExportPipeline: symbol;
        PreviewEngine: symbol;
        EffectsLibrary: symbol;
        ProjectManager: symbol;
        AssetManager: symbol;
        AIIntegrationLayer: symbol;
        AssetGenerationAI: symbol;
        WorkflowAutomationEngine: symbol;
        CommandPaletteSystem: symbol;
        KeybindingSystem: symbol;
        NotificationSystem: symbol;
        HistorySystem: symbol;
        SearchSystem: symbol;
        BackupRecoverySystem: symbol;
        LocalizationSystem: symbol;
        AccessibilitySystem: symbol;
        PerformanceMonitorSystem: symbol;
        ThemeSystem: symbol;
    };
    SystemsContainerModule: ContainerModule;
    initializeAllSystems: typeof initializeAllSystems;
    disposeAllSystems: typeof disposeAllSystems;
    getAllSystemsStatus: typeof getAllSystemsStatus;
};
export default _default;
