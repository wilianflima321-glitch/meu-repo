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

// ============================================================================
// ENGINE RUNTIME
// ============================================================================

export {
  // State & Mode enums
  EngineState,
  EngineMode,
  SubsystemPriority,
  
  // Time management
  EngineTime,
  
  // Subsystem interface
  IEngineSubsystem,
  
  // Configuration
  EngineConfig,
  
  // Main runtime class
  AethelEngineRuntime,
  
  // Statistics
  FrameStats
} from './aethel-engine-runtime';

// ============================================================================
// ECS (ENTITY COMPONENT SYSTEM)
// ============================================================================

export {
  // Type definitions
  EntityId,
  ComponentType,
  SystemPriority,
  
  // Interfaces
  IComponent,
  ISystem,
  ComponentQuery,
  Archetype,
  EntityDescriptor,
  
  // Built-in components
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
  
  // Component registry
  registerComponent,
  createComponentInstance,
  
  // Main ECS world
  ECSWorld,
  
  // Helper functions
  createEntityAtPosition,
  createCamera,
  createLight
} from './ecs-world';

// ============================================================================
// SCENE MANAGEMENT
// ============================================================================

export {
  // Type definitions
  SceneId,
  LayerId,
  
  // Enums
  SceneLoadState,
  SceneLoadMode,
  
  // Interfaces
  Vector3,
  StreamingSettings,
  SceneMetadata,
  EnvironmentSettings,
  SceneEntityRef,
  SceneNode,
  SceneLayer,
  
  // Scene class
  Scene,
  
  // Scene Manager
  SceneManager,
  
  // World Composition (open worlds)
  WorldCompositionManager
} from './scene-manager';

// ============================================================================
// ENGINE SUBSYSTEMS
// ============================================================================

export {
  // Physics
  PhysicsSubsystem,
} from './subsystems/physics-subsystem';

export type {
  PhysicsConfig,
  PhysicsBody,
  CollisionInfo,
  RaycastResult,
  BodyType,
} from './subsystems/physics-subsystem';

export {
  // Rendering
  RenderSubsystem,
} from './subsystems/render-subsystem';

export type {
  RenderConfig,
  Camera,
  Renderable,
  Light,
  LightType,
  RenderPassType
} from './subsystems/render-subsystem';

// ============================================================================
// TYPE SYMBOLS FOR DI
// ============================================================================

export const ENGINE_TYPES = {
  EngineRuntime: Symbol.for('AethelEngineRuntime'),
  ECSWorld: Symbol.for('ECSWorld'),
  SceneManager: Symbol.for('SceneManager'),
  WorldComposition: Symbol.for('WorldCompositionManager')
};

// ============================================================================
// AAA ENGINE FACADE
// ============================================================================

export {
  AethelEngine,
  ENGINE_SYMBOLS,
  createAethelEngine,
} from './aethel-engine-facade';

export type {
  EngineConfig as AethelEngineConfig,
  EngineState as AethelEngineState,
  DebugInfo,
} from './aethel-engine-facade';

// ============================================================================
// ENGINE MODULE INFO
// ============================================================================

export const EngineModuleInfo = {
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
