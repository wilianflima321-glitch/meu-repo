import { Event } from '@theia/core/lib/common';
/**
 * Entity ID - unique identifier for each entity
 */
export type EntityId = number;
/**
 * Component type identifier
 */
export type ComponentType = string;
/**
 * System priority for execution order
 */
export type SystemPriority = number;
/**
 * Component base interface
 */
export interface IComponent {
    readonly type: ComponentType;
    enabled: boolean;
}
/**
 * System base interface
 */
export interface ISystem {
    readonly name: string;
    readonly priority: SystemPriority;
    readonly requiredComponents: ComponentType[];
    enabled: boolean;
    initialize?(): void;
    destroy?(): void;
    update(entities: EntityId[], deltaTime: number): void;
    fixedUpdate?(entities: EntityId[], deltaTime: number): void;
    lateUpdate?(entities: EntityId[], deltaTime: number): void;
}
/**
 * Query for filtering entities
 */
export interface ComponentQuery {
    all?: ComponentType[];
    any?: ComponentType[];
    none?: ComponentType[];
}
/**
 * Entity archetype - defines a set of components
 */
export interface Archetype {
    id: number;
    components: Set<ComponentType>;
    entities: Set<EntityId>;
}
/**
 * Entity creation descriptor
 */
export interface EntityDescriptor {
    name?: string;
    parent?: EntityId;
    tags?: string[];
    components?: IComponent[];
    active?: boolean;
}
/**
 * Entity data
 */
interface EntityData {
    id: EntityId;
    name: string;
    active: boolean;
    parent: EntityId | null;
    children: Set<EntityId>;
    tags: Set<string>;
    archetype: Archetype | null;
}
/**
 * Transform component - position, rotation, scale
 */
export declare class TransformComponent implements IComponent {
    readonly type = "Transform";
    enabled: boolean;
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    scale: {
        x: number;
        y: number;
        z: number;
    };
    private _worldMatrix;
    private _localMatrix;
    private _dirty;
    get worldMatrix(): Float32Array;
    setPosition(x: number, y: number, z: number): void;
    setRotationEuler(x: number, y: number, z: number): void;
    setScale(x: number, y: number, z: number): void;
    lookAt(targetX: number, targetY: number, targetZ: number): void;
    private updateMatrices;
    markDirty(): void;
}
/**
 * Mesh Renderer component
 */
export declare class MeshRendererComponent implements IComponent {
    readonly type = "MeshRenderer";
    enabled: boolean;
    meshId: string | null;
    materialIds: string[];
    castShadows: boolean;
    receiveShadows: boolean;
    layer: number;
    sortingOrder: number;
}
/**
 * Camera component
 */
export declare class CameraComponent implements IComponent {
    readonly type = "Camera";
    enabled: boolean;
    projection: 'perspective' | 'orthographic';
    fieldOfView: number;
    nearClip: number;
    farClip: number;
    orthographicSize: number;
    aspectRatio: number;
    clearColor: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    clearFlags: ('color' | 'depth' | 'stencil')[];
    renderOrder: number;
    viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    getProjectionMatrix(): Float32Array;
}
/**
 * Light component
 */
export declare class LightComponent implements IComponent {
    readonly type = "Light";
    enabled: boolean;
    lightType: 'directional' | 'point' | 'spot' | 'area';
    color: {
        r: number;
        g: number;
        b: number;
    };
    intensity: number;
    range: number;
    spotAngle: number;
    innerSpotAngle: number;
    castShadows: boolean;
    shadowResolution: number;
    shadowBias: number;
    shadowNormalBias: number;
}
/**
 * Rigidbody component (physics)
 */
export declare class RigidbodyComponent implements IComponent {
    readonly type = "Rigidbody";
    enabled: boolean;
    bodyType: 'dynamic' | 'kinematic' | 'static';
    mass: number;
    drag: number;
    angularDrag: number;
    useGravity: boolean;
    isKinematic: boolean;
    freezePosition: {
        x: boolean;
        y: boolean;
        z: boolean;
    };
    freezeRotation: {
        x: boolean;
        y: boolean;
        z: boolean;
    };
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    angularVelocity: {
        x: number;
        y: number;
        z: number;
    };
    physicsHandle: number | null;
}
/**
 * Collider component base
 */
export declare class ColliderComponent implements IComponent {
    readonly type = "Collider";
    enabled: boolean;
    colliderType: 'box' | 'sphere' | 'capsule' | 'mesh';
    isTrigger: boolean;
    center: {
        x: number;
        y: number;
        z: number;
    };
    size: {
        x: number;
        y: number;
        z: number;
    };
    radius: number;
    height: number;
    direction: 'x' | 'y' | 'z';
    friction: number;
    bounciness: number;
    physicsHandle: number | null;
}
/**
 * Audio Source component
 */
export declare class AudioSourceComponent implements IComponent {
    readonly type = "AudioSource";
    enabled: boolean;
    clipId: string | null;
    volume: number;
    pitch: number;
    loop: boolean;
    playOnAwake: boolean;
    spatialBlend: number;
    minDistance: number;
    maxDistance: number;
    rolloffMode: 'linear' | 'logarithmic';
    isPlaying: boolean;
    time: number;
}
/**
 * Script component - holds behavior references
 */
export declare class ScriptComponent implements IComponent {
    readonly type = "Script";
    enabled: boolean;
    scriptId: string | null;
    properties: Record<string, unknown>;
    onStart?: () => void;
    onUpdate?: (deltaTime: number) => void;
    onFixedUpdate?: (deltaTime: number) => void;
    onLateUpdate?: (deltaTime: number) => void;
    onDestroy?: () => void;
    onEnable?: () => void;
    onDisable?: () => void;
    onCollisionEnter?: (other: EntityId) => void;
    onCollisionExit?: (other: EntityId) => void;
    onTriggerEnter?: (other: EntityId) => void;
    onTriggerExit?: (other: EntityId) => void;
}
/**
 * Animator component
 */
export declare class AnimatorComponent implements IComponent {
    readonly type = "Animator";
    enabled: boolean;
    controllerId: string | null;
    speed: number;
    applyRootMotion: boolean;
    currentState: string | null;
    parameters: Map<string, number | boolean | string>;
    layers: {
        name: string;
        weight: number;
        blendMode: 'override' | 'additive';
    }[];
}
/**
 * UI Canvas component
 */
export declare class CanvasComponent implements IComponent {
    readonly type = "Canvas";
    enabled: boolean;
    renderMode: 'screen-space-overlay' | 'screen-space-camera' | 'world-space';
    sortOrder: number;
    pixelPerfect: boolean;
    referenceResolution: {
        width: number;
        height: number;
    };
    scaleMode: 'constant-pixel-size' | 'scale-with-screen-size' | 'constant-physical-size';
    matchWidthOrHeight: number;
}
type ComponentConstructor<T extends IComponent = IComponent> = new () => T;
export declare function registerComponent<T extends IComponent>(type: ComponentType, constructor: ComponentConstructor<T>): void;
export declare function createComponentInstance(type: ComponentType): IComponent | null;
export declare class ECSWorld {
    private nextEntityId;
    private nextArchetypeId;
    private readonly entities;
    private readonly recycledIds;
    private readonly componentStores;
    private readonly archetypes;
    private readonly systems;
    private systemsSorted;
    private readonly queryCache;
    private queryCacheDirty;
    private readonly onEntityCreatedEmitter;
    private readonly onEntityDestroyedEmitter;
    private readonly onComponentAddedEmitter;
    private readonly onComponentRemovedEmitter;
    readonly onEntityCreated: Event<{
        entity: EntityId;
    }>;
    readonly onEntityDestroyed: Event<{
        entity: EntityId;
    }>;
    readonly onComponentAdded: Event<{
        entity: EntityId;
        component: ComponentType;
    }>;
    readonly onComponentRemoved: Event<{
        entity: EntityId;
        component: ComponentType;
    }>;
    /**
     * Create a new entity
     */
    createEntity(descriptor?: EntityDescriptor): EntityId;
    /**
     * Destroy an entity and all its components
     */
    destroyEntity(entityId: EntityId): void;
    /**
     * Check if entity exists
     */
    hasEntity(entityId: EntityId): boolean;
    /**
     * Get entity data
     */
    getEntityData(entityId: EntityId): EntityData | undefined;
    /**
     * Set entity active state
     */
    setEntityActive(entityId: EntityId, active: boolean): void;
    /**
     * Get all entities
     */
    getAllEntities(): EntityId[];
    /**
     * Get entity count
     */
    getEntityCount(): number;
    /**
     * Add a component to an entity
     */
    addComponent<T extends IComponent>(entityId: EntityId, component: T): T;
    /**
     * Remove a component from an entity
     */
    removeComponent(entityId: EntityId, componentType: ComponentType): void;
    /**
     * Get a component from an entity
     */
    getComponent<T extends IComponent>(entityId: EntityId, componentType: ComponentType): T | undefined;
    /**
     * Check if entity has a component
     */
    hasComponent(entityId: EntityId, componentType: ComponentType): boolean;
    /**
     * Get all components of an entity
     */
    getComponents(entityId: EntityId): IComponent[];
    /**
     * Get all components of a type
     */
    getAllComponentsOfType<T extends IComponent>(componentType: ComponentType): Map<EntityId, T>;
    private updateEntityArchetype;
    /**
     * Query entities by component requirements
     */
    query(query: ComponentQuery): EntityId[];
    /**
     * Query entities by tag
     */
    queryByTag(tag: string): EntityId[];
    /**
     * Query entities by name
     */
    queryByName(name: string): EntityId | undefined;
    /**
     * Clear query cache
     */
    clearQueryCache(): void;
    /**
     * Register a system
     */
    registerSystem(system: ISystem): void;
    /**
     * Unregister a system
     */
    unregisterSystem(systemName: string): void;
    /**
     * Get a system by name
     */
    getSystem<T extends ISystem>(name: string): T | undefined;
    /**
     * Sort systems by priority
     */
    private sortSystems;
    /**
     * Update all systems
     */
    update(deltaTime: number): void;
    /**
     * Fixed update all systems
     */
    fixedUpdate(deltaTime: number): void;
    /**
     * Late update all systems
     */
    lateUpdate(deltaTime: number): void;
    /**
     * Serialize world to JSON
     */
    serialize(): string;
    /**
     * Deserialize world from JSON
     */
    deserialize(json: string): void;
    /**
     * Clear all entities and reset
     */
    clear(): void;
    dispose(): void;
}
/**
 * Create an entity with Transform at position
 */
export declare function createEntityAtPosition(world: ECSWorld, name: string, x: number, y: number, z: number): EntityId;
/**
 * Create a camera entity
 */
export declare function createCamera(world: ECSWorld, name: string, fov?: number): EntityId;
/**
 * Create a light entity
 */
export declare function createLight(world: ECSWorld, name: string, type?: 'directional' | 'point' | 'spot'): EntityId;
export {};
