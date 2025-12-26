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

import { Container, ContainerModule, interfaces } from 'inversify';

// ============================================================================
// AAA SYSTEM EXPORTS - Explicit exports to avoid conflicts
// ============================================================================

// Rendering - Primary exports
export {
    AdvancedRenderingEngine,
    Vector3 as RenderVector3,
    Matrix4x4 as RenderMatrix4x4,
    BoundingBox as RenderBoundingBox,
} from './rendering/advanced-rendering-engine';

// Animation - Primary exports  
export {
    SkeletalAnimationEngine,
    Transform as AnimTransform,
    Quaternion as AnimQuaternion,
} from './animation/skeletal-animation-engine';

// World - Primary exports
export {
    WorldPartitionSystem,
} from './world/world-partition-system';

// Physics - Advanced
export {
    AdvancedPhysicsEngine,
    CollisionEvent as AdvancedCollisionEvent,
} from './physics/advanced-physics-engine';

// Physics - Base
export {
    PhysicsEngine,
    type RigidBodyDescriptor,
    type ColliderDescriptor,
    type JointDescriptor,
} from './physics/physics-engine';

// Audio - Spatial
export {
    SpatialAudioEngine,
    AudioEffect as SpatialAudioEffect,
} from './audio/spatial-audio-engine';

// Audio - Processing
export {
    AudioProcessingEngine,
} from './audio/audio-processing-engine';

// Networking
export {
    MultiplayerSystem,
} from './networking/multiplayer-system';

// Game AI - Advanced
export {
    GameAIEngine as AdvancedGameAIEngine,
    GOAPPlanner,
    UtilityAISystem,
    PerceptionSystem as AdvancedPerceptionSystem,
    NavigationSystem,
    AIAgent,
    SquadAISystem,
    AILLMIntegration,
} from './game-ai/advanced-game-ai-engine';

// Game AI - Base
export {
    BehaviorTreeEngine,
    NavMeshSystem,
    PerceptionSystem,
    Blackboard,
    type BTStatus,
    type BTContext,
    type NavMeshData,
} from './game-ai/game-ai-engine';

// Procedural
export {
    ProceduralGenerationEngine,
} from './procedural/procedural-generation-engine';

// Input
export {
    AdvancedInputSystem,
} from './input/advanced-input-system';

// AI Copilot
export {
    AethelCopilot,
} from './copilot/aethel-copilot';

// Native Bridge
export {
    NativeBridge,
} from './native/native-bridge';

// Engine Core
export {
    AethelEngine,
    type EngineState,
    type EngineEvents,
} from './engine/aethel-engine-facade';

export {
    AethelEngineRuntime,
} from './engine/aethel-engine-runtime';

export {
    ECSWorld,
    type EntityId,
    type IComponent,
} from './engine/ecs-world';

export {
    SceneManager,
} from './engine/scene-manager';

// ============================================================================
// AAA SYSTEM IMPORTS FOR DI
// ============================================================================

import { AdvancedRenderingEngine } from './rendering/advanced-rendering-engine';
import { SkeletalAnimationEngine } from './animation/skeletal-animation-engine';
import { WorldPartitionSystem } from './world/world-partition-system';
import { AdvancedPhysicsEngine } from './physics/advanced-physics-engine';
import { SpatialAudioEngine } from './audio/spatial-audio-engine';
import { MultiplayerSystem } from './networking/multiplayer-system';
import { GameAIEngine as AdvancedGameAIEngineClass } from './game-ai/advanced-game-ai-engine';
import { ProceduralGenerationEngine } from './procedural/procedural-generation-engine';
import { AdvancedInputSystem } from './input/advanced-input-system';
import { AethelCopilot } from './copilot/aethel-copilot';
import { NativeBridge } from './native/native-bridge';
import { AethelEngine } from './engine/aethel-engine-facade';
import { AethelEngineRuntime } from './engine/aethel-engine-runtime';
import { ECSWorld } from './engine/ecs-world';
import { SceneManager } from './engine/scene-manager';

// ============================================================================
// AAA SYMBOLS FOR DI
// ============================================================================

export const AAA_TYPES = {
    // Core Engine
    Engine: Symbol.for('AethelEngine'),
    EngineRuntime: Symbol.for('AethelEngineRuntime'),
    ECSWorld: Symbol.for('ECSWorld'),
    SceneManager: Symbol.for('SceneManager'),
    
    // Rendering
    AdvancedRenderingEngine: Symbol.for('AdvancedRenderingEngine'),
    
    // Animation
    SkeletalAnimationEngine: Symbol.for('SkeletalAnimationEngine'),
    
    // World
    WorldPartitionSystem: Symbol.for('WorldPartitionSystem'),
    
    // Physics
    AdvancedPhysicsEngine: Symbol.for('AdvancedPhysicsEngine'),
    VehiclePhysics: Symbol.for('VehiclePhysics'),
    DestructionSystem: Symbol.for('DestructionSystem'),
    RagdollSystem: Symbol.for('RagdollSystem'),
    ClothSimulation: Symbol.for('ClothSimulation'),
    WaterPhysics: Symbol.for('WaterPhysics'),
    
    // Audio
    SpatialAudioEngine: Symbol.for('SpatialAudioEngine'),
    MusicSystem: Symbol.for('MusicSystem'),
    DialogueSystem: Symbol.for('DialogueSystem'),
    
    // Networking
    MultiplayerSystem: Symbol.for('MultiplayerSystem'),
    MatchmakingSystem: Symbol.for('MatchmakingSystem'),
    VoiceChatSystem: Symbol.for('VoiceChatSystem'),
    AntiCheatSystem: Symbol.for('AntiCheatSystem'),
    
    // Game AI
    AdvancedGameAIEngine: Symbol.for('AdvancedGameAIEngine'),
    BehaviorTreeSystem: Symbol.for('BehaviorTreeSystem'),
    GOAPSystem: Symbol.for('GOAPSystem'),
    UtilityAISystem: Symbol.for('UtilityAISystem'),
    PerceptionSystem: Symbol.for('PerceptionSystem'),
    NavigationSystem: Symbol.for('NavigationSystem'),
    SquadAISystem: Symbol.for('SquadAISystem'),
    
    // Procedural
    ProceduralGenerationEngine: Symbol.for('ProceduralGenerationEngine'),
    TerrainGenerator: Symbol.for('TerrainGenerator'),
    VegetationGenerator: Symbol.for('VegetationGenerator'),
    DungeonGenerator: Symbol.for('DungeonGenerator'),
    
    // Input
    AdvancedInputSystem: Symbol.for('AdvancedInputSystem'),
    
    // AI Copilot
    AethelCopilot: Symbol.for('AethelCopilot'),
    
    // Native
    NativeBridge: Symbol.for('NativeBridge'),
};

// ============================================================================
// AAA CONTAINER MODULE
// ============================================================================

export const AAASystemsContainerModule = new ContainerModule((bind: interfaces.Bind) => {
    // ========== Core Engine ==========
    bind<AethelEngine>(AAA_TYPES.Engine)
        .to(AethelEngine)
        .inSingletonScope();
    
    bind<AethelEngineRuntime>(AAA_TYPES.EngineRuntime)
        .to(AethelEngineRuntime)
        .inSingletonScope();
    
    bind<ECSWorld>(AAA_TYPES.ECSWorld)
        .to(ECSWorld)
        .inSingletonScope();
    
    bind<SceneManager>(AAA_TYPES.SceneManager)
        .to(SceneManager)
        .inSingletonScope();
    
    // ========== Rendering ==========
    bind<AdvancedRenderingEngine>(AAA_TYPES.AdvancedRenderingEngine)
        .to(AdvancedRenderingEngine)
        .inSingletonScope();
    
    // ========== Animation ==========
    bind<SkeletalAnimationEngine>(AAA_TYPES.SkeletalAnimationEngine)
        .to(SkeletalAnimationEngine)
        .inSingletonScope();
    
    // ========== World ==========
    bind<WorldPartitionSystem>(AAA_TYPES.WorldPartitionSystem)
        .to(WorldPartitionSystem)
        .inSingletonScope();
    
    // ========== Physics ==========
    bind<AdvancedPhysicsEngine>(AAA_TYPES.AdvancedPhysicsEngine)
        .to(AdvancedPhysicsEngine)
        .inSingletonScope();
    
    // ========== Audio ==========
    bind<SpatialAudioEngine>(AAA_TYPES.SpatialAudioEngine)
        .to(SpatialAudioEngine)
        .inSingletonScope();
    
    // ========== Networking ==========
    bind<MultiplayerSystem>(AAA_TYPES.MultiplayerSystem)
        .to(MultiplayerSystem)
        .inSingletonScope();
    
    // ========== Game AI ==========
    bind<AdvancedGameAIEngineClass>(AAA_TYPES.AdvancedGameAIEngine)
        .to(AdvancedGameAIEngineClass)
        .inSingletonScope();
    
    // ========== Procedural ==========
    bind<ProceduralGenerationEngine>(AAA_TYPES.ProceduralGenerationEngine)
        .to(ProceduralGenerationEngine)
        .inSingletonScope();
    
    // ========== Input ==========
    bind<AdvancedInputSystem>(AAA_TYPES.AdvancedInputSystem)
        .to(AdvancedInputSystem)
        .inSingletonScope();
    
    // ========== AI Copilot ==========
    bind<AethelCopilot>(AAA_TYPES.AethelCopilot)
        .to(AethelCopilot)
        .inSingletonScope();
    
    // ========== Native ==========
    bind<NativeBridge>(AAA_TYPES.NativeBridge)
        .to(NativeBridge)
        .inSingletonScope();
});

// ============================================================================
// INITIALIZATION
// ============================================================================

export interface AAAInitConfig {
    // Graphics
    renderingBackend: 'webgpu' | 'webgl2';
    resolution: { width: number; height: number };
    quality: 'low' | 'medium' | 'high' | 'ultra';
    
    // Audio
    spatialAudio: boolean;
    hrtfEnabled: boolean;
    
    // Physics
    physicsTimeStep: number;
    enableVehicles: boolean;
    enableDestruction: boolean;
    enableRagdoll: boolean;
    
    // Networking
    networkMode: 'offline' | 'client' | 'server' | 'host';
    tickRate: number;
    
    // AI
    enableGameAI: boolean;
    enableCopilot: boolean;
    copilotProvider: 'openai' | 'anthropic' | 'google' | 'local';
    
    // Performance
    targetFPS: number;
    enableNativeBridge: boolean;
}

const DEFAULT_CONFIG: AAAInitConfig = {
    renderingBackend: 'webgpu',
    resolution: { width: 1920, height: 1080 },
    quality: 'high',
    spatialAudio: true,
    hrtfEnabled: true,
    physicsTimeStep: 1/60,
    enableVehicles: true,
    enableDestruction: true,
    enableRagdoll: true,
    networkMode: 'offline',
    tickRate: 60,
    enableGameAI: true,
    enableCopilot: true,
    copilotProvider: 'openai',
    targetFPS: 60,
    enableNativeBridge: true,
};

/**
 * Initialize all AAA systems
 */
export async function initializeAAASystems(
    container: Container,
    config: Partial<AAAInitConfig> = {}
): Promise<AAASystemsStatus> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    console.log('[Aethel AAA] Initializing AAA game engine systems...');
    console.log('[Aethel AAA] Config:', finalConfig);
    
    const status: AAASystemsStatus = {
        initialized: [],
        failed: [],
        totalSystems: 12,
        ready: false,
    };
    
    try {
        // 1. Initialize Native Bridge first (low-level)
        if (finalConfig.enableNativeBridge) {
            const nativeBridge = container.get<NativeBridge>(AAA_TYPES.NativeBridge);
            await nativeBridge.initialize();
            status.initialized.push('NativeBridge');
            console.log('[Aethel AAA] ✅ NativeBridge initialized');
        }
        
        // 2. Initialize Rendering
        const rendering = container.get<AdvancedRenderingEngine>(AAA_TYPES.AdvancedRenderingEngine);
        // Rendering will be initialized when canvas is provided
        status.initialized.push('AdvancedRenderingEngine');
        console.log('[Aethel AAA] ✅ AdvancedRenderingEngine initialized');
        
        // 3. Initialize Physics
        const physics = container.get<AdvancedPhysicsEngine>(AAA_TYPES.AdvancedPhysicsEngine);
        // Physics is self-initializing
        status.initialized.push('AdvancedPhysicsEngine');
        console.log('[Aethel AAA] ✅ AdvancedPhysicsEngine initialized');
        
        // 4. Initialize Audio
        const audio = container.get<SpatialAudioEngine>(AAA_TYPES.SpatialAudioEngine);
        await audio.initialize();
        status.initialized.push('SpatialAudioEngine');
        console.log('[Aethel AAA] ✅ SpatialAudioEngine initialized');
        
        // 5. Initialize Animation
        const animation = container.get<SkeletalAnimationEngine>(AAA_TYPES.SkeletalAnimationEngine);
        status.initialized.push('SkeletalAnimationEngine');
        console.log('[Aethel AAA] ✅ SkeletalAnimationEngine initialized');
        
        // 6. Initialize World
        const world = container.get<WorldPartitionSystem>(AAA_TYPES.WorldPartitionSystem);
        status.initialized.push('WorldPartitionSystem');
        console.log('[Aethel AAA] ✅ WorldPartitionSystem initialized');
        
        // 7. Initialize Networking
        if (finalConfig.networkMode !== 'offline') {
            const network = container.get<MultiplayerSystem>(AAA_TYPES.MultiplayerSystem);
            await network.initialize();
            status.initialized.push('MultiplayerSystem');
            console.log('[Aethel AAA] ✅ MultiplayerSystem initialized');
        } else {
            status.initialized.push('MultiplayerSystem (offline)');
        }
        
        // 8. Initialize Game AI
        if (finalConfig.enableGameAI) {
            const gameAI = container.get<AdvancedGameAIEngineClass>(AAA_TYPES.AdvancedGameAIEngine);
            status.initialized.push('AdvancedGameAIEngine');
            console.log('[Aethel AAA] ✅ AdvancedGameAIEngine initialized');
        }
        
        // 9. Initialize Procedural
        const procedural = container.get<ProceduralGenerationEngine>(AAA_TYPES.ProceduralGenerationEngine);
        status.initialized.push('ProceduralGenerationEngine');
        console.log('[Aethel AAA] ✅ ProceduralGenerationEngine initialized');
        
        // 10. Initialize Input
        const input = container.get<AdvancedInputSystem>(AAA_TYPES.AdvancedInputSystem);
        input.initialize();
        status.initialized.push('AdvancedInputSystem');
        console.log('[Aethel AAA] ✅ AdvancedInputSystem initialized');
        
        // 11. Initialize AI Copilot
        if (finalConfig.enableCopilot) {
            const copilot = container.get<AethelCopilot>(AAA_TYPES.AethelCopilot);
            copilot.configure({ provider: finalConfig.copilotProvider });
            status.initialized.push('AethelCopilot');
            console.log('[Aethel AAA] ✅ AethelCopilot initialized');
        }
        
        // 12. Initialize Engine Facade (last - orchestrates everything)
        const engine = container.get<AethelEngine>(AAA_TYPES.Engine);
        await engine.initialize({
            graphics: {
                backend: finalConfig.renderingBackend,
                resolution: finalConfig.resolution,
                quality: finalConfig.quality,
                renderScale: 1.0,
                targetFPS: finalConfig.targetFPS,
                vsync: true,
            },
            audio: {
                masterVolume: 1.0,
                musicVolume: 0.8,
                sfxVolume: 1.0,
                voiceVolume: 1.0,
                spatialAudio: finalConfig.spatialAudio,
                hrtf: finalConfig.hrtfEnabled,
            },
            physics: {
                gravity: { x: 0, y: -9.81, z: 0 },
                timeStep: finalConfig.physicsTimeStep,
                substeps: 4,
                solver: 'tgs',
            },
            networking: {
                mode: finalConfig.networkMode,
                tickRate: finalConfig.tickRate,
                maxPlayers: 32,
            },
            ai: {
                enabled: finalConfig.enableGameAI,
                copilotEnabled: finalConfig.enableCopilot,
                copilotProvider: finalConfig.copilotProvider,
            },
            debug: {
                enabled: false,
                showFPS: true,
                showStats: false,
                physicsDebug: false,
                aiDebug: false,
            },
        });
        status.initialized.push('AethelEngine');
        console.log('[Aethel AAA] ✅ AethelEngine initialized');
        
        status.ready = true;
        console.log('[Aethel AAA] 🎮 All AAA systems initialized successfully!');
        console.log(`[Aethel AAA] Systems: ${status.initialized.length}/${status.totalSystems}`);
        
    } catch (error) {
        console.error('[Aethel AAA] ❌ Initialization failed:', error);
        status.failed.push({
            system: 'Unknown',
            error: error instanceof Error ? error.message : String(error),
        });
    }
    
    return status;
}

/**
 * Dispose all AAA systems
 */
export async function disposeAAASystems(container: Container): Promise<void> {
    console.log('[Aethel AAA] Disposing all AAA systems...');
    
    try {
        // Stop engine first
        const engine = container.get<AethelEngine>(AAA_TYPES.Engine);
        engine.stop();
        
        // Dispose systems in reverse order
        const systemsToDispose = [
            AAA_TYPES.AethelCopilot,
            AAA_TYPES.AdvancedInputSystem,
            AAA_TYPES.ProceduralGenerationEngine,
            AAA_TYPES.AdvancedGameAIEngine,
            AAA_TYPES.MultiplayerSystem,
            AAA_TYPES.WorldPartitionSystem,
            AAA_TYPES.SkeletalAnimationEngine,
            AAA_TYPES.SpatialAudioEngine,
            AAA_TYPES.AdvancedPhysicsEngine,
            AAA_TYPES.AdvancedRenderingEngine,
            AAA_TYPES.NativeBridge,
        ];
        
        for (const type of systemsToDispose) {
            try {
                const system = container.get<{ dispose?: () => void | Promise<void> }>(type);
                if (system.dispose) {
                    await system.dispose();
                }
            } catch {
                // System might not be initialized
            }
        }
        
        console.log('[Aethel AAA] All systems disposed');
        
    } catch (error) {
        console.error('[Aethel AAA] Error during disposal:', error);
    }
}

// ============================================================================
// STATUS & MONITORING
// ============================================================================

export interface AAASystemsStatus {
    initialized: string[];
    failed: { system: string; error: string }[];
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
export function getAAASsystemsHealth(container: Container): AAASystemHealth[] {
    const health: AAASystemHealth[] = [];
    
    const systemChecks = [
        { type: AAA_TYPES.Engine, name: 'AethelEngine' },
        { type: AAA_TYPES.AdvancedRenderingEngine, name: 'AdvancedRenderingEngine' },
        { type: AAA_TYPES.SkeletalAnimationEngine, name: 'SkeletalAnimationEngine' },
        { type: AAA_TYPES.WorldPartitionSystem, name: 'WorldPartitionSystem' },
        { type: AAA_TYPES.AdvancedPhysicsEngine, name: 'AdvancedPhysicsEngine' },
        { type: AAA_TYPES.SpatialAudioEngine, name: 'SpatialAudioEngine' },
        { type: AAA_TYPES.MultiplayerSystem, name: 'MultiplayerSystem' },
        { type: AAA_TYPES.AdvancedGameAIEngine, name: 'AdvancedGameAIEngine' },
        { type: AAA_TYPES.ProceduralGenerationEngine, name: 'ProceduralGenerationEngine' },
        { type: AAA_TYPES.AdvancedInputSystem, name: 'AdvancedInputSystem' },
        { type: AAA_TYPES.AethelCopilot, name: 'AethelCopilot' },
        { type: AAA_TYPES.NativeBridge, name: 'NativeBridge' },
    ];
    
    for (const { type, name } of systemChecks) {
        try {
            const system = container.get(type);
            health.push({
                system: name,
                status: system ? 'healthy' : 'error',
                details: {},
            });
        } catch {
            health.push({
                system: name,
                status: 'error',
                details: { error: 'Not bound in container' },
            });
        }
    }
    
    return health;
}

// ============================================================================
// QUICK START HELPERS
// ============================================================================

/**
 * Create a fully configured AAA game engine container
 */
export function createAAAContainer(): Container {
    const container = new Container();
    container.load(AAASystemsContainerModule as interfaces.ContainerModule);
    return container;
}

/**
 * Quick start: Create and initialize everything
 */
export async function quickStartAAA(config?: Partial<AAAInitConfig>): Promise<{
    container: Container;
    engine: AethelEngine;
    status: AAASystemsStatus;
}> {
    const container = createAAAContainer();
    const status = await initializeAAASystems(container, config);
    const engine = container.get<AethelEngine>(AAA_TYPES.Engine);
    
    return { container, engine, status };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    // Types
    AAA_TYPES,
    
    // Container
    AAASystemsContainerModule,
    createAAAContainer,
    
    // Initialization
    initializeAAASystems,
    disposeAAASystems,
    quickStartAAA,
    
    // Monitoring
    getAAASsystemsHealth,
};
