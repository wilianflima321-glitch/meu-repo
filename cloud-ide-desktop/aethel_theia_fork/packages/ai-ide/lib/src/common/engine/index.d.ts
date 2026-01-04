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
export { EngineState, EngineMode, SubsystemPriority, EngineTime, IEngineSubsystem, EngineConfig, AethelEngineRuntime, FrameStats } from './aethel-engine-runtime';
export { EntityId, ComponentType, SystemPriority, IComponent, ISystem, ComponentQuery, Archetype, EntityDescriptor, TransformComponent, MeshRendererComponent, CameraComponent, LightComponent, RigidbodyComponent, ColliderComponent, AudioSourceComponent, ScriptComponent, AnimatorComponent, CanvasComponent, registerComponent, createComponentInstance, ECSWorld, createEntityAtPosition, createCamera, createLight } from './ecs-world';
export { SceneId, LayerId, SceneLoadState, SceneLoadMode, Vector3, StreamingSettings, SceneMetadata, EnvironmentSettings, SceneEntityRef, SceneNode, SceneLayer, Scene, SceneManager, WorldCompositionManager } from './scene-manager';
export { PhysicsSubsystem, } from './subsystems/physics-subsystem';
export type { PhysicsConfig, PhysicsBody, CollisionInfo, RaycastResult, BodyType, } from './subsystems/physics-subsystem';
export { RenderSubsystem, } from './subsystems/render-subsystem';
export type { RenderConfig, Camera, Renderable, Light, LightType, RenderPassType } from './subsystems/render-subsystem';
export declare const ENGINE_TYPES: {
    EngineRuntime: symbol;
    ECSWorld: symbol;
    SceneManager: symbol;
    WorldComposition: symbol;
};
export { AethelEngine, ENGINE_SYMBOLS, createAethelEngine, } from './aethel-engine-facade';
export type { EngineConfig as AethelEngineConfig, EngineState as AethelEngineState, DebugInfo, } from './aethel-engine-facade';
export declare const EngineModuleInfo: {
    name: string;
    version: string;
    description: string;
    components: string[];
    capabilities: string[];
};
