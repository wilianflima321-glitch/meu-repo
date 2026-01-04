"use strict";
/**
 * AETHEL ENGINE - Core Engine Systems
 *
 * This module provides unified game/application engine functionality:
 * - Engine Runtime: Game loop, subsystem management, lifecycle
 * - ECS World: Entity-Component-System architecture
 * - Scene Manager: Level/world management with streaming
 *
 * Comparable to Unreal Engine's UEngine + World + Actor system
 *
 * @version 1.0.0
 * @module @aethel/engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineModuleInfo = exports.createAethelEngine = exports.ENGINE_SYMBOLS = exports.AethelEngine = exports.ENGINE_TYPES = exports.RenderSubsystem = exports.PhysicsSubsystem = exports.WorldCompositionManager = exports.SceneManager = exports.Scene = exports.SceneLoadMode = exports.SceneLoadState = exports.createLight = exports.createCamera = exports.createEntityAtPosition = exports.ECSWorld = exports.createComponentInstance = exports.registerComponent = exports.CanvasComponent = exports.AnimatorComponent = exports.ScriptComponent = exports.AudioSourceComponent = exports.ColliderComponent = exports.RigidbodyComponent = exports.LightComponent = exports.CameraComponent = exports.MeshRendererComponent = exports.TransformComponent = exports.AethelEngineRuntime = exports.EngineTime = void 0;
// ============================================================================
// ENGINE RUNTIME
// ============================================================================
var aethel_engine_runtime_1 = require("./aethel-engine-runtime");
// Time management
Object.defineProperty(exports, "EngineTime", { enumerable: true, get: function () { return aethel_engine_runtime_1.EngineTime; } });
// Main runtime class
Object.defineProperty(exports, "AethelEngineRuntime", { enumerable: true, get: function () { return aethel_engine_runtime_1.AethelEngineRuntime; } });
// ============================================================================
// ECS (ENTITY COMPONENT SYSTEM)
// ============================================================================
var ecs_world_1 = require("./ecs-world");
// Built-in components
Object.defineProperty(exports, "TransformComponent", { enumerable: true, get: function () { return ecs_world_1.TransformComponent; } });
Object.defineProperty(exports, "MeshRendererComponent", { enumerable: true, get: function () { return ecs_world_1.MeshRendererComponent; } });
Object.defineProperty(exports, "CameraComponent", { enumerable: true, get: function () { return ecs_world_1.CameraComponent; } });
Object.defineProperty(exports, "LightComponent", { enumerable: true, get: function () { return ecs_world_1.LightComponent; } });
Object.defineProperty(exports, "RigidbodyComponent", { enumerable: true, get: function () { return ecs_world_1.RigidbodyComponent; } });
Object.defineProperty(exports, "ColliderComponent", { enumerable: true, get: function () { return ecs_world_1.ColliderComponent; } });
Object.defineProperty(exports, "AudioSourceComponent", { enumerable: true, get: function () { return ecs_world_1.AudioSourceComponent; } });
Object.defineProperty(exports, "ScriptComponent", { enumerable: true, get: function () { return ecs_world_1.ScriptComponent; } });
Object.defineProperty(exports, "AnimatorComponent", { enumerable: true, get: function () { return ecs_world_1.AnimatorComponent; } });
Object.defineProperty(exports, "CanvasComponent", { enumerable: true, get: function () { return ecs_world_1.CanvasComponent; } });
// Component registry
Object.defineProperty(exports, "registerComponent", { enumerable: true, get: function () { return ecs_world_1.registerComponent; } });
Object.defineProperty(exports, "createComponentInstance", { enumerable: true, get: function () { return ecs_world_1.createComponentInstance; } });
// Main ECS world
Object.defineProperty(exports, "ECSWorld", { enumerable: true, get: function () { return ecs_world_1.ECSWorld; } });
// Helper functions
Object.defineProperty(exports, "createEntityAtPosition", { enumerable: true, get: function () { return ecs_world_1.createEntityAtPosition; } });
Object.defineProperty(exports, "createCamera", { enumerable: true, get: function () { return ecs_world_1.createCamera; } });
Object.defineProperty(exports, "createLight", { enumerable: true, get: function () { return ecs_world_1.createLight; } });
// ============================================================================
// SCENE MANAGEMENT
// ============================================================================
var scene_manager_1 = require("./scene-manager");
// Enums
Object.defineProperty(exports, "SceneLoadState", { enumerable: true, get: function () { return scene_manager_1.SceneLoadState; } });
Object.defineProperty(exports, "SceneLoadMode", { enumerable: true, get: function () { return scene_manager_1.SceneLoadMode; } });
// Scene class
Object.defineProperty(exports, "Scene", { enumerable: true, get: function () { return scene_manager_1.Scene; } });
// Scene Manager
Object.defineProperty(exports, "SceneManager", { enumerable: true, get: function () { return scene_manager_1.SceneManager; } });
// World Composition (open worlds)
Object.defineProperty(exports, "WorldCompositionManager", { enumerable: true, get: function () { return scene_manager_1.WorldCompositionManager; } });
// ============================================================================
// ENGINE SUBSYSTEMS
// ============================================================================
var physics_subsystem_1 = require("./subsystems/physics-subsystem");
// Physics
Object.defineProperty(exports, "PhysicsSubsystem", { enumerable: true, get: function () { return physics_subsystem_1.PhysicsSubsystem; } });
var render_subsystem_1 = require("./subsystems/render-subsystem");
// Rendering
Object.defineProperty(exports, "RenderSubsystem", { enumerable: true, get: function () { return render_subsystem_1.RenderSubsystem; } });
// ============================================================================
// TYPE SYMBOLS FOR DI
// ============================================================================
exports.ENGINE_TYPES = {
    EngineRuntime: Symbol.for('AethelEngineRuntime'),
    ECSWorld: Symbol.for('ECSWorld'),
    SceneManager: Symbol.for('SceneManager'),
    WorldComposition: Symbol.for('WorldCompositionManager')
};
// ============================================================================
// AAA ENGINE FACADE
// ============================================================================
var aethel_engine_facade_1 = require("./aethel-engine-facade");
Object.defineProperty(exports, "AethelEngine", { enumerable: true, get: function () { return aethel_engine_facade_1.AethelEngine; } });
Object.defineProperty(exports, "ENGINE_SYMBOLS", { enumerable: true, get: function () { return aethel_engine_facade_1.ENGINE_SYMBOLS; } });
Object.defineProperty(exports, "createAethelEngine", { enumerable: true, get: function () { return aethel_engine_facade_1.createAethelEngine; } });
// ============================================================================
// ENGINE MODULE INFO
// ============================================================================
exports.EngineModuleInfo = {
    name: 'Aethel Engine Core',
    version: '1.0.0',
    description: 'AAA-level game engine runtime with full feature set',
    components: [
        'Engine Runtime',
        'ECS World',
        'Scene Manager',
        'World Composition',
        'AAA Engine Facade'
    ],
    capabilities: [
        // Core
        'Game loop with fixed timestep physics',
        'Priority-based subsystem initialization',
        'Entity-Component-System architecture',
        'Archetype-based component storage',
        'Scene streaming and level management',
        'World composition for open worlds',
        'Spatial partitioning for queries',
        'Scene serialization/deserialization',
        // AAA Features
        'Lumen-like Global Illumination',
        'Motion Matching Animation',
        'Vehicle/Destruction/Ragdoll Physics',
        'Spatial 3D Audio with HRTF',
        'Multiplayer with Lag Compensation',
        'BT/GOAP/Utility AI Systems',
        'Procedural World Generation',
        'AI Copilot Integration'
    ]
};
