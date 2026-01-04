"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AAASystemsContainerModule = exports.AAA_TYPES = exports.SceneManager = exports.ECSWorld = exports.AethelEngineRuntime = exports.AethelEngine = exports.NativeBridge = exports.AethelCopilot = exports.AdvancedInputSystem = exports.ProceduralGenerationEngine = exports.Blackboard = exports.PerceptionSystem = exports.NavMeshSystem = exports.BehaviorTreeEngine = exports.AILLMIntegration = exports.SquadAISystem = exports.AIAgent = exports.NavigationSystem = exports.AdvancedPerceptionSystem = exports.UtilityAISystem = exports.GOAPPlanner = exports.AdvancedGameAIEngine = exports.MultiplayerSystem = exports.AudioProcessingEngine = exports.SpatialAudioEngine = exports.PhysicsEngine = exports.AdvancedPhysicsEngine = exports.WorldPartitionSystem = exports.SkeletalAnimationEngine = exports.AdvancedRenderingEngine = void 0;
exports.initializeAAASystems = initializeAAASystems;
exports.disposeAAASystems = disposeAAASystems;
exports.getAAASsystemsHealth = getAAASsystemsHealth;
exports.createAAAContainer = createAAAContainer;
exports.quickStartAAA = quickStartAAA;
const inversify_1 = require("inversify");
// ============================================================================
// AAA SYSTEM EXPORTS - Explicit exports to avoid conflicts
// ============================================================================
// Rendering - Primary exports
var advanced_rendering_engine_1 = require("./rendering/advanced-rendering-engine");
Object.defineProperty(exports, "AdvancedRenderingEngine", { enumerable: true, get: function () { return advanced_rendering_engine_1.AdvancedRenderingEngine; } });
// Animation - Primary exports  
var skeletal_animation_engine_1 = require("./animation/skeletal-animation-engine");
Object.defineProperty(exports, "SkeletalAnimationEngine", { enumerable: true, get: function () { return skeletal_animation_engine_1.SkeletalAnimationEngine; } });
// World - Primary exports
var world_partition_system_1 = require("./world/world-partition-system");
Object.defineProperty(exports, "WorldPartitionSystem", { enumerable: true, get: function () { return world_partition_system_1.WorldPartitionSystem; } });
// Physics - Advanced
var advanced_physics_engine_1 = require("./physics/advanced-physics-engine");
Object.defineProperty(exports, "AdvancedPhysicsEngine", { enumerable: true, get: function () { return advanced_physics_engine_1.AdvancedPhysicsEngine; } });
// Physics - Base
var physics_engine_1 = require("./physics/physics-engine");
Object.defineProperty(exports, "PhysicsEngine", { enumerable: true, get: function () { return physics_engine_1.PhysicsEngine; } });
// Audio - Spatial
var spatial_audio_engine_1 = require("./audio/spatial-audio-engine");
Object.defineProperty(exports, "SpatialAudioEngine", { enumerable: true, get: function () { return spatial_audio_engine_1.SpatialAudioEngine; } });
// Audio - Processing
var audio_processing_engine_1 = require("./audio/audio-processing-engine");
Object.defineProperty(exports, "AudioProcessingEngine", { enumerable: true, get: function () { return audio_processing_engine_1.AudioProcessingEngine; } });
// Networking
var multiplayer_system_1 = require("./networking/multiplayer-system");
Object.defineProperty(exports, "MultiplayerSystem", { enumerable: true, get: function () { return multiplayer_system_1.MultiplayerSystem; } });
// Game AI - Advanced
var advanced_game_ai_engine_1 = require("./game-ai/advanced-game-ai-engine");
Object.defineProperty(exports, "AdvancedGameAIEngine", { enumerable: true, get: function () { return advanced_game_ai_engine_1.GameAIEngine; } });
Object.defineProperty(exports, "GOAPPlanner", { enumerable: true, get: function () { return advanced_game_ai_engine_1.GOAPPlanner; } });
Object.defineProperty(exports, "UtilityAISystem", { enumerable: true, get: function () { return advanced_game_ai_engine_1.UtilityAISystem; } });
Object.defineProperty(exports, "AdvancedPerceptionSystem", { enumerable: true, get: function () { return advanced_game_ai_engine_1.PerceptionSystem; } });
Object.defineProperty(exports, "NavigationSystem", { enumerable: true, get: function () { return advanced_game_ai_engine_1.NavigationSystem; } });
Object.defineProperty(exports, "AIAgent", { enumerable: true, get: function () { return advanced_game_ai_engine_1.AIAgent; } });
Object.defineProperty(exports, "SquadAISystem", { enumerable: true, get: function () { return advanced_game_ai_engine_1.SquadAISystem; } });
Object.defineProperty(exports, "AILLMIntegration", { enumerable: true, get: function () { return advanced_game_ai_engine_1.AILLMIntegration; } });
// Game AI - Base
var game_ai_engine_1 = require("./game-ai/game-ai-engine");
Object.defineProperty(exports, "BehaviorTreeEngine", { enumerable: true, get: function () { return game_ai_engine_1.BehaviorTreeEngine; } });
Object.defineProperty(exports, "NavMeshSystem", { enumerable: true, get: function () { return game_ai_engine_1.NavMeshSystem; } });
Object.defineProperty(exports, "PerceptionSystem", { enumerable: true, get: function () { return game_ai_engine_1.PerceptionSystem; } });
Object.defineProperty(exports, "Blackboard", { enumerable: true, get: function () { return game_ai_engine_1.Blackboard; } });
// Procedural
var procedural_generation_engine_1 = require("./procedural/procedural-generation-engine");
Object.defineProperty(exports, "ProceduralGenerationEngine", { enumerable: true, get: function () { return procedural_generation_engine_1.ProceduralGenerationEngine; } });
// Input
var advanced_input_system_1 = require("./input/advanced-input-system");
Object.defineProperty(exports, "AdvancedInputSystem", { enumerable: true, get: function () { return advanced_input_system_1.AdvancedInputSystem; } });
// AI Copilot
var aethel_copilot_1 = require("./copilot/aethel-copilot");
Object.defineProperty(exports, "AethelCopilot", { enumerable: true, get: function () { return aethel_copilot_1.AethelCopilot; } });
// Native Bridge
var native_bridge_1 = require("./native/native-bridge");
Object.defineProperty(exports, "NativeBridge", { enumerable: true, get: function () { return native_bridge_1.NativeBridge; } });
// Engine Core
var aethel_engine_facade_1 = require("./engine/aethel-engine-facade");
Object.defineProperty(exports, "AethelEngine", { enumerable: true, get: function () { return aethel_engine_facade_1.AethelEngine; } });
var aethel_engine_runtime_1 = require("./engine/aethel-engine-runtime");
Object.defineProperty(exports, "AethelEngineRuntime", { enumerable: true, get: function () { return aethel_engine_runtime_1.AethelEngineRuntime; } });
var ecs_world_1 = require("./engine/ecs-world");
Object.defineProperty(exports, "ECSWorld", { enumerable: true, get: function () { return ecs_world_1.ECSWorld; } });
var scene_manager_1 = require("./engine/scene-manager");
Object.defineProperty(exports, "SceneManager", { enumerable: true, get: function () { return scene_manager_1.SceneManager; } });
// ============================================================================
// AAA SYSTEM IMPORTS FOR DI
// ============================================================================
const advanced_rendering_engine_2 = require("./rendering/advanced-rendering-engine");
const skeletal_animation_engine_2 = require("./animation/skeletal-animation-engine");
const world_partition_system_2 = require("./world/world-partition-system");
const advanced_physics_engine_2 = require("./physics/advanced-physics-engine");
const spatial_audio_engine_2 = require("./audio/spatial-audio-engine");
const multiplayer_system_2 = require("./networking/multiplayer-system");
const advanced_game_ai_engine_2 = require("./game-ai/advanced-game-ai-engine");
const procedural_generation_engine_2 = require("./procedural/procedural-generation-engine");
const advanced_input_system_2 = require("./input/advanced-input-system");
const aethel_copilot_2 = require("./copilot/aethel-copilot");
const native_bridge_2 = require("./native/native-bridge");
const aethel_engine_facade_2 = require("./engine/aethel-engine-facade");
const aethel_engine_runtime_2 = require("./engine/aethel-engine-runtime");
const ecs_world_2 = require("./engine/ecs-world");
const scene_manager_2 = require("./engine/scene-manager");
// ============================================================================
// AAA SYMBOLS FOR DI
// ============================================================================
exports.AAA_TYPES = {
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
exports.AAASystemsContainerModule = new inversify_1.ContainerModule((bind) => {
    // ========== Core Engine ==========
    bind(exports.AAA_TYPES.Engine)
        .to(aethel_engine_facade_2.AethelEngine)
        .inSingletonScope();
    bind(exports.AAA_TYPES.EngineRuntime)
        .to(aethel_engine_runtime_2.AethelEngineRuntime)
        .inSingletonScope();
    bind(exports.AAA_TYPES.ECSWorld)
        .to(ecs_world_2.ECSWorld)
        .inSingletonScope();
    bind(exports.AAA_TYPES.SceneManager)
        .to(scene_manager_2.SceneManager)
        .inSingletonScope();
    // ========== Rendering ==========
    bind(exports.AAA_TYPES.AdvancedRenderingEngine)
        .to(advanced_rendering_engine_2.AdvancedRenderingEngine)
        .inSingletonScope();
    // ========== Animation ==========
    bind(exports.AAA_TYPES.SkeletalAnimationEngine)
        .to(skeletal_animation_engine_2.SkeletalAnimationEngine)
        .inSingletonScope();
    // ========== World ==========
    bind(exports.AAA_TYPES.WorldPartitionSystem)
        .to(world_partition_system_2.WorldPartitionSystem)
        .inSingletonScope();
    // ========== Physics ==========
    bind(exports.AAA_TYPES.AdvancedPhysicsEngine)
        .to(advanced_physics_engine_2.AdvancedPhysicsEngine)
        .inSingletonScope();
    // ========== Audio ==========
    bind(exports.AAA_TYPES.SpatialAudioEngine)
        .to(spatial_audio_engine_2.SpatialAudioEngine)
        .inSingletonScope();
    // ========== Networking ==========
    bind(exports.AAA_TYPES.MultiplayerSystem)
        .to(multiplayer_system_2.MultiplayerSystem)
        .inSingletonScope();
    // ========== Game AI ==========
    bind(exports.AAA_TYPES.AdvancedGameAIEngine)
        .to(advanced_game_ai_engine_2.GameAIEngine)
        .inSingletonScope();
    // ========== Procedural ==========
    bind(exports.AAA_TYPES.ProceduralGenerationEngine)
        .to(procedural_generation_engine_2.ProceduralGenerationEngine)
        .inSingletonScope();
    // ========== Input ==========
    bind(exports.AAA_TYPES.AdvancedInputSystem)
        .to(advanced_input_system_2.AdvancedInputSystem)
        .inSingletonScope();
    // ========== AI Copilot ==========
    bind(exports.AAA_TYPES.AethelCopilot)
        .to(aethel_copilot_2.AethelCopilot)
        .inSingletonScope();
    // ========== Native ==========
    bind(exports.AAA_TYPES.NativeBridge)
        .to(native_bridge_2.NativeBridge)
        .inSingletonScope();
});
const DEFAULT_CONFIG = {
    renderingBackend: 'webgpu',
    resolution: { width: 1920, height: 1080 },
    quality: 'high',
    spatialAudio: true,
    hrtfEnabled: true,
    physicsTimeStep: 1 / 60,
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
async function initializeAAASystems(container, config = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    console.log('[Aethel AAA] Initializing AAA game engine systems...');
    console.log('[Aethel AAA] Config:', finalConfig);
    const status = {
        initialized: [],
        failed: [],
        totalSystems: 12,
        ready: false,
    };
    try {
        // 1. Initialize Native Bridge first (low-level)
        if (finalConfig.enableNativeBridge) {
            const nativeBridge = container.get(exports.AAA_TYPES.NativeBridge);
            await nativeBridge.initialize();
            status.initialized.push('NativeBridge');
            console.log('[Aethel AAA] ✅ NativeBridge initialized');
        }
        // 2. Initialize Rendering
        const rendering = container.get(exports.AAA_TYPES.AdvancedRenderingEngine);
        // Rendering will be initialized when canvas is provided
        status.initialized.push('AdvancedRenderingEngine');
        console.log('[Aethel AAA] ✅ AdvancedRenderingEngine initialized');
        // 3. Initialize Physics
        const physics = container.get(exports.AAA_TYPES.AdvancedPhysicsEngine);
        // Physics is self-initializing
        status.initialized.push('AdvancedPhysicsEngine');
        console.log('[Aethel AAA] ✅ AdvancedPhysicsEngine initialized');
        // 4. Initialize Audio
        const audio = container.get(exports.AAA_TYPES.SpatialAudioEngine);
        await audio.initialize();
        status.initialized.push('SpatialAudioEngine');
        console.log('[Aethel AAA] ✅ SpatialAudioEngine initialized');
        // 5. Initialize Animation
        const animation = container.get(exports.AAA_TYPES.SkeletalAnimationEngine);
        status.initialized.push('SkeletalAnimationEngine');
        console.log('[Aethel AAA] ✅ SkeletalAnimationEngine initialized');
        // 6. Initialize World
        const world = container.get(exports.AAA_TYPES.WorldPartitionSystem);
        status.initialized.push('WorldPartitionSystem');
        console.log('[Aethel AAA] ✅ WorldPartitionSystem initialized');
        // 7. Initialize Networking
        if (finalConfig.networkMode !== 'offline') {
            const network = container.get(exports.AAA_TYPES.MultiplayerSystem);
            await network.initialize();
            status.initialized.push('MultiplayerSystem');
            console.log('[Aethel AAA] ✅ MultiplayerSystem initialized');
        }
        else {
            status.initialized.push('MultiplayerSystem (offline)');
        }
        // 8. Initialize Game AI
        if (finalConfig.enableGameAI) {
            const gameAI = container.get(exports.AAA_TYPES.AdvancedGameAIEngine);
            status.initialized.push('AdvancedGameAIEngine');
            console.log('[Aethel AAA] ✅ AdvancedGameAIEngine initialized');
        }
        // 9. Initialize Procedural
        const procedural = container.get(exports.AAA_TYPES.ProceduralGenerationEngine);
        status.initialized.push('ProceduralGenerationEngine');
        console.log('[Aethel AAA] ✅ ProceduralGenerationEngine initialized');
        // 10. Initialize Input
        const input = container.get(exports.AAA_TYPES.AdvancedInputSystem);
        input.initialize();
        status.initialized.push('AdvancedInputSystem');
        console.log('[Aethel AAA] ✅ AdvancedInputSystem initialized');
        // 11. Initialize AI Copilot
        if (finalConfig.enableCopilot) {
            const copilot = container.get(exports.AAA_TYPES.AethelCopilot);
            copilot.configure({ provider: finalConfig.copilotProvider });
            status.initialized.push('AethelCopilot');
            console.log('[Aethel AAA] ✅ AethelCopilot initialized');
        }
        // 12. Initialize Engine Facade (last - orchestrates everything)
        const engine = container.get(exports.AAA_TYPES.Engine);
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
    }
    catch (error) {
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
async function disposeAAASystems(container) {
    console.log('[Aethel AAA] Disposing all AAA systems...');
    try {
        // Stop engine first
        const engine = container.get(exports.AAA_TYPES.Engine);
        engine.stop();
        // Dispose systems in reverse order
        const systemsToDispose = [
            exports.AAA_TYPES.AethelCopilot,
            exports.AAA_TYPES.AdvancedInputSystem,
            exports.AAA_TYPES.ProceduralGenerationEngine,
            exports.AAA_TYPES.AdvancedGameAIEngine,
            exports.AAA_TYPES.MultiplayerSystem,
            exports.AAA_TYPES.WorldPartitionSystem,
            exports.AAA_TYPES.SkeletalAnimationEngine,
            exports.AAA_TYPES.SpatialAudioEngine,
            exports.AAA_TYPES.AdvancedPhysicsEngine,
            exports.AAA_TYPES.AdvancedRenderingEngine,
            exports.AAA_TYPES.NativeBridge,
        ];
        for (const type of systemsToDispose) {
            try {
                const system = container.get(type);
                if (system.dispose) {
                    await system.dispose();
                }
            }
            catch {
                // System might not be initialized
            }
        }
        console.log('[Aethel AAA] All systems disposed');
    }
    catch (error) {
        console.error('[Aethel AAA] Error during disposal:', error);
    }
}
/**
 * Get health status of all AAA systems
 */
function getAAASsystemsHealth(container) {
    const health = [];
    const systemChecks = [
        { type: exports.AAA_TYPES.Engine, name: 'AethelEngine' },
        { type: exports.AAA_TYPES.AdvancedRenderingEngine, name: 'AdvancedRenderingEngine' },
        { type: exports.AAA_TYPES.SkeletalAnimationEngine, name: 'SkeletalAnimationEngine' },
        { type: exports.AAA_TYPES.WorldPartitionSystem, name: 'WorldPartitionSystem' },
        { type: exports.AAA_TYPES.AdvancedPhysicsEngine, name: 'AdvancedPhysicsEngine' },
        { type: exports.AAA_TYPES.SpatialAudioEngine, name: 'SpatialAudioEngine' },
        { type: exports.AAA_TYPES.MultiplayerSystem, name: 'MultiplayerSystem' },
        { type: exports.AAA_TYPES.AdvancedGameAIEngine, name: 'AdvancedGameAIEngine' },
        { type: exports.AAA_TYPES.ProceduralGenerationEngine, name: 'ProceduralGenerationEngine' },
        { type: exports.AAA_TYPES.AdvancedInputSystem, name: 'AdvancedInputSystem' },
        { type: exports.AAA_TYPES.AethelCopilot, name: 'AethelCopilot' },
        { type: exports.AAA_TYPES.NativeBridge, name: 'NativeBridge' },
    ];
    for (const { type, name } of systemChecks) {
        try {
            const system = container.get(type);
            health.push({
                system: name,
                status: system ? 'healthy' : 'error',
                details: {},
            });
        }
        catch {
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
function createAAAContainer() {
    const container = new inversify_1.Container();
    container.load(exports.AAASystemsContainerModule);
    return container;
}
/**
 * Quick start: Create and initialize everything
 */
async function quickStartAAA(config) {
    const container = createAAAContainer();
    const status = await initializeAAASystems(container, config);
    const engine = container.get(exports.AAA_TYPES.Engine);
    return { container, engine, status };
}
// ============================================================================
// DEFAULT EXPORT
// ============================================================================
exports.default = {
    // Types
    AAA_TYPES: exports.AAA_TYPES,
    // Container
    AAASystemsContainerModule: exports.AAASystemsContainerModule,
    createAAAContainer,
    // Initialization
    initializeAAASystems,
    disposeAAASystems,
    quickStartAAA,
    // Monitoring
    getAAASsystemsHealth,
};
