/**
 * ============================================================================
 * AETHEL ENGINE - AAA SYSTEMS INDEX
 * ============================================================================
 *
 * Central integration file for all AAA game engine systems.
 * This file provides:
 * - Unified exports for all AAA systems
 * - DI Container bindings
 * - Initialization orchestration
 * - System status monitoring
 *
 * SYSTEMS INCLUDED:
 * 1. Advanced Rendering Engine (Lumen-like GI, SSR, SSAO, TAA)
 * 2. Skeletal Animation Engine (Motion Matching, IK, Blend Spaces)
 * 3. World Partition System (Streaming, HLOD, Data Layers)
 * 4. Advanced Physics Engine (Vehicles, Destruction, Ragdoll)
 * 5. Spatial Audio Engine (HRTF, Reverb, Occlusion)
 * 6. Multiplayer System (Lag Compensation, Voice, Matchmaking)
 * 7. Advanced Game AI Engine (BT, GOAP, Utility AI)
 * 8. Procedural Generation Engine (Terrain, Dungeons, Roads)
 * 9. Advanced Input System (Multi-device, Combos, Haptics)
 * 10. AI Copilot (Code Assist, Asset Gen, Design AI)
 * 11. Native Bridge (C++/WASM, SIMD, Threading)
 * 12. Engine Facade (Unified API, Game Loop)
 */
import { Container, ContainerModule } from 'inversify';
export { AdvancedRenderingEngine, Vector3 as RenderVector3, Matrix4x4 as RenderMatrix4x4, BoundingBox as RenderBoundingBox, } from './rendering/advanced-rendering-engine';
export { SkeletalAnimationEngine, Transform as AnimTransform, Quaternion as AnimQuaternion, } from './animation/skeletal-animation-engine';
export { WorldPartitionSystem, } from './world/world-partition-system';
export { AdvancedPhysicsEngine, CollisionEvent as AdvancedCollisionEvent, } from './physics/advanced-physics-engine';
export { PhysicsEngine, type RigidBodyDescriptor, type ColliderDescriptor, type JointDescriptor, } from './physics/physics-engine';
export { SpatialAudioEngine, AudioEffect as SpatialAudioEffect, } from './audio/spatial-audio-engine';
export { AudioProcessingEngine, } from './audio/audio-processing-engine';
export { MultiplayerSystem, } from './networking/multiplayer-system';
export { GameAIEngine as AdvancedGameAIEngine, GOAPPlanner, UtilityAISystem, PerceptionSystem as AdvancedPerceptionSystem, NavigationSystem, AIAgent, SquadAISystem, AILLMIntegration, } from './game-ai/advanced-game-ai-engine';
export { BehaviorTreeEngine, NavMeshSystem, PerceptionSystem, Blackboard, type BTStatus, type BTContext, type NavMeshData, } from './game-ai/game-ai-engine';
export { ProceduralGenerationEngine, } from './procedural/procedural-generation-engine';
export { AdvancedInputSystem, } from './input/advanced-input-system';
export { AethelCopilot, } from './copilot/aethel-copilot';
export { NativeBridge, } from './native/native-bridge';
export { AethelEngine, type EngineState, type EngineEvents, } from './engine/aethel-engine-facade';
export { AethelEngineRuntime, } from './engine/aethel-engine-runtime';
export { ECSWorld, type EntityId, type IComponent, } from './engine/ecs-world';
export { SceneManager, } from './engine/scene-manager';
import { AethelEngine } from './engine/aethel-engine-facade';
export declare const AAA_TYPES: {
    Engine: symbol;
    EngineRuntime: symbol;
    ECSWorld: symbol;
    SceneManager: symbol;
    AdvancedRenderingEngine: symbol;
    SkeletalAnimationEngine: symbol;
    WorldPartitionSystem: symbol;
    AdvancedPhysicsEngine: symbol;
    VehiclePhysics: symbol;
    DestructionSystem: symbol;
    RagdollSystem: symbol;
    ClothSimulation: symbol;
    WaterPhysics: symbol;
    SpatialAudioEngine: symbol;
    MusicSystem: symbol;
    DialogueSystem: symbol;
    MultiplayerSystem: symbol;
    MatchmakingSystem: symbol;
    VoiceChatSystem: symbol;
    AntiCheatSystem: symbol;
    AdvancedGameAIEngine: symbol;
    BehaviorTreeSystem: symbol;
    GOAPSystem: symbol;
    UtilityAISystem: symbol;
    PerceptionSystem: symbol;
    NavigationSystem: symbol;
    SquadAISystem: symbol;
    ProceduralGenerationEngine: symbol;
    TerrainGenerator: symbol;
    VegetationGenerator: symbol;
    DungeonGenerator: symbol;
    AdvancedInputSystem: symbol;
    AethelCopilot: symbol;
    NativeBridge: symbol;
};
export declare const AAASystemsContainerModule: ContainerModule;
export interface AAAInitConfig {
    renderingBackend: 'webgpu' | 'webgl2';
    resolution: {
        width: number;
        height: number;
    };
    quality: 'low' | 'medium' | 'high' | 'ultra';
    spatialAudio: boolean;
    hrtfEnabled: boolean;
    physicsTimeStep: number;
    enableVehicles: boolean;
    enableDestruction: boolean;
    enableRagdoll: boolean;
    networkMode: 'offline' | 'client' | 'server' | 'host';
    tickRate: number;
    enableGameAI: boolean;
    enableCopilot: boolean;
    copilotProvider: 'openai' | 'anthropic' | 'google' | 'local';
    targetFPS: number;
    enableNativeBridge: boolean;
}
/**
 * Initialize all AAA systems
 */
export declare function initializeAAASystems(container: Container, config?: Partial<AAAInitConfig>): Promise<AAASystemsStatus>;
/**
 * Dispose all AAA systems
 */
export declare function disposeAAASystems(container: Container): Promise<void>;
export interface AAASystemsStatus {
    initialized: string[];
    failed: {
        system: string;
        error: string;
    }[];
    totalSystems: number;
    ready: boolean;
}
export interface AAASystemHealth {
    system: string;
    status: 'healthy' | 'degraded' | 'error';
    details: Record<string, unknown>;
}
/**
 * Get health status of all AAA systems
 */
export declare function getAAASsystemsHealth(container: Container): AAASystemHealth[];
/**
 * Create a fully configured AAA game engine container
 */
export declare function createAAAContainer(): Container;
/**
 * Quick start: Create and initialize everything
 */
export declare function quickStartAAA(config?: Partial<AAAInitConfig>): Promise<{
    container: Container;
    engine: AethelEngine;
    status: AAASystemsStatus;
}>;
declare const _default: {
    AAA_TYPES: {
        Engine: symbol;
        EngineRuntime: symbol;
        ECSWorld: symbol;
        SceneManager: symbol;
        AdvancedRenderingEngine: symbol;
        SkeletalAnimationEngine: symbol;
        WorldPartitionSystem: symbol;
        AdvancedPhysicsEngine: symbol;
        VehiclePhysics: symbol;
        DestructionSystem: symbol;
        RagdollSystem: symbol;
        ClothSimulation: symbol;
        WaterPhysics: symbol;
        SpatialAudioEngine: symbol;
        MusicSystem: symbol;
        DialogueSystem: symbol;
        MultiplayerSystem: symbol;
        MatchmakingSystem: symbol;
        VoiceChatSystem: symbol;
        AntiCheatSystem: symbol;
        AdvancedGameAIEngine: symbol;
        BehaviorTreeSystem: symbol;
        GOAPSystem: symbol;
        UtilityAISystem: symbol;
        PerceptionSystem: symbol;
        NavigationSystem: symbol;
        SquadAISystem: symbol;
        ProceduralGenerationEngine: symbol;
        TerrainGenerator: symbol;
        VegetationGenerator: symbol;
        DungeonGenerator: symbol;
        AdvancedInputSystem: symbol;
        AethelCopilot: symbol;
        NativeBridge: symbol;
    };
    AAASystemsContainerModule: ContainerModule;
    createAAAContainer: typeof createAAAContainer;
    initializeAAASystems: typeof initializeAAASystems;
    disposeAAASystems: typeof disposeAAASystems;
    quickStartAAA: typeof quickStartAAA;
    getAAASsystemsHealth: typeof getAAASsystemsHealth;
};
export default _default;
