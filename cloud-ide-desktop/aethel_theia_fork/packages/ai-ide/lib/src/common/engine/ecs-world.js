"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ECSWorld = exports.CanvasComponent = exports.AnimatorComponent = exports.ScriptComponent = exports.AudioSourceComponent = exports.ColliderComponent = exports.RigidbodyComponent = exports.LightComponent = exports.CameraComponent = exports.MeshRendererComponent = exports.TransformComponent = void 0;
exports.registerComponent = registerComponent;
exports.createComponentInstance = createComponentInstance;
exports.createEntityAtPosition = createEntityAtPosition;
exports.createCamera = createCamera;
exports.createLight = createLight;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// BUILT-IN COMPONENTS
// ============================================================================
/**
 * Transform component - position, rotation, scale
 */
class TransformComponent {
    constructor() {
        this.type = 'Transform';
        this.enabled = true;
        // Local space
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0, w: 1 }; // Quaternion
        this.scale = { x: 1, y: 1, z: 1 };
        // Cached world space (computed)
        this._worldMatrix = new Float32Array(16);
        this._localMatrix = new Float32Array(16);
        this._dirty = true;
    }
    get worldMatrix() {
        if (this._dirty) {
            this.updateMatrices();
        }
        return this._worldMatrix;
    }
    setPosition(x, y, z) {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        this._dirty = true;
    }
    setRotationEuler(x, y, z) {
        // Convert euler to quaternion
        const cx = Math.cos(x * 0.5);
        const cy = Math.cos(y * 0.5);
        const cz = Math.cos(z * 0.5);
        const sx = Math.sin(x * 0.5);
        const sy = Math.sin(y * 0.5);
        const sz = Math.sin(z * 0.5);
        this.rotation.w = cx * cy * cz + sx * sy * sz;
        this.rotation.x = sx * cy * cz - cx * sy * sz;
        this.rotation.y = cx * sy * cz + sx * cy * sz;
        this.rotation.z = cx * cy * sz - sx * sy * cz;
        this._dirty = true;
    }
    setScale(x, y, z) {
        this.scale.x = x;
        this.scale.y = y;
        this.scale.z = z;
        this._dirty = true;
    }
    lookAt(targetX, targetY, targetZ) {
        // Simplified lookAt - compute direction and convert to quaternion
        const dx = targetX - this.position.x;
        const dy = targetY - this.position.y;
        const dz = targetZ - this.position.z;
        const yaw = Math.atan2(dx, dz);
        const pitch = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz));
        this.setRotationEuler(pitch, yaw, 0);
    }
    updateMatrices() {
        // Build local matrix from TRS
        const { x: px, y: py, z: pz } = this.position;
        const { x: qx, y: qy, z: qz, w: qw } = this.rotation;
        const { x: sx, y: sy, z: sz } = this.scale;
        // Rotation matrix from quaternion
        const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
        const xx = qx * x2, xy = qx * y2, xz = qx * z2;
        const yy = qy * y2, yz = qy * z2, zz = qz * z2;
        const wx = qw * x2, wy = qw * y2, wz = qw * z2;
        this._localMatrix[0] = (1 - (yy + zz)) * sx;
        this._localMatrix[1] = (xy + wz) * sx;
        this._localMatrix[2] = (xz - wy) * sx;
        this._localMatrix[3] = 0;
        this._localMatrix[4] = (xy - wz) * sy;
        this._localMatrix[5] = (1 - (xx + zz)) * sy;
        this._localMatrix[6] = (yz + wx) * sy;
        this._localMatrix[7] = 0;
        this._localMatrix[8] = (xz + wy) * sz;
        this._localMatrix[9] = (yz - wx) * sz;
        this._localMatrix[10] = (1 - (xx + yy)) * sz;
        this._localMatrix[11] = 0;
        this._localMatrix[12] = px;
        this._localMatrix[13] = py;
        this._localMatrix[14] = pz;
        this._localMatrix[15] = 1;
        // For now, world = local (parent hierarchy would multiply here)
        this._worldMatrix.set(this._localMatrix);
        this._dirty = false;
    }
    markDirty() {
        this._dirty = true;
    }
}
exports.TransformComponent = TransformComponent;
/**
 * Mesh Renderer component
 */
class MeshRendererComponent {
    constructor() {
        this.type = 'MeshRenderer';
        this.enabled = true;
        this.meshId = null;
        this.materialIds = [];
        this.castShadows = true;
        this.receiveShadows = true;
        this.layer = 0;
        this.sortingOrder = 0;
    }
}
exports.MeshRendererComponent = MeshRendererComponent;
/**
 * Camera component
 */
class CameraComponent {
    constructor() {
        this.type = 'Camera';
        this.enabled = true;
        this.projection = 'perspective';
        this.fieldOfView = 60; // Degrees
        this.nearClip = 0.1;
        this.farClip = 1000;
        this.orthographicSize = 5;
        this.aspectRatio = 16 / 9;
        this.clearColor = { r: 0.1, g: 0.1, b: 0.1, a: 1 };
        this.clearFlags = ['color', 'depth'];
        this.renderOrder = 0;
        this.viewport = { x: 0, y: 0, width: 1, height: 1 };
    }
    getProjectionMatrix() {
        const matrix = new Float32Array(16);
        if (this.projection === 'perspective') {
            const f = 1.0 / Math.tan((this.fieldOfView * Math.PI / 180) / 2);
            const nf = 1 / (this.nearClip - this.farClip);
            matrix[0] = f / this.aspectRatio;
            matrix[5] = f;
            matrix[10] = (this.farClip + this.nearClip) * nf;
            matrix[11] = -1;
            matrix[14] = 2 * this.farClip * this.nearClip * nf;
        }
        else {
            const top = this.orthographicSize;
            const bottom = -this.orthographicSize;
            const right = this.orthographicSize * this.aspectRatio;
            const left = -right;
            matrix[0] = 2 / (right - left);
            matrix[5] = 2 / (top - bottom);
            matrix[10] = -2 / (this.farClip - this.nearClip);
            matrix[12] = -(right + left) / (right - left);
            matrix[13] = -(top + bottom) / (top - bottom);
            matrix[14] = -(this.farClip + this.nearClip) / (this.farClip - this.nearClip);
            matrix[15] = 1;
        }
        return matrix;
    }
}
exports.CameraComponent = CameraComponent;
/**
 * Light component
 */
class LightComponent {
    constructor() {
        this.type = 'Light';
        this.enabled = true;
        this.lightType = 'point';
        this.color = { r: 1, g: 1, b: 1 };
        this.intensity = 1;
        this.range = 10;
        this.spotAngle = 30;
        this.innerSpotAngle = 21;
        this.castShadows = false;
        this.shadowResolution = 1024;
        this.shadowBias = 0.005;
        this.shadowNormalBias = 0.4;
    }
}
exports.LightComponent = LightComponent;
/**
 * Rigidbody component (physics)
 */
class RigidbodyComponent {
    constructor() {
        this.type = 'Rigidbody';
        this.enabled = true;
        this.bodyType = 'dynamic';
        this.mass = 1;
        this.drag = 0;
        this.angularDrag = 0.05;
        this.useGravity = true;
        this.isKinematic = false;
        this.freezePosition = { x: false, y: false, z: false };
        this.freezeRotation = { x: false, y: false, z: false };
        // Runtime state
        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        // Physics engine handle
        this.physicsHandle = null;
    }
}
exports.RigidbodyComponent = RigidbodyComponent;
/**
 * Collider component base
 */
class ColliderComponent {
    constructor() {
        this.type = 'Collider';
        this.enabled = true;
        this.colliderType = 'box';
        this.isTrigger = false;
        this.center = { x: 0, y: 0, z: 0 };
        // Box
        this.size = { x: 1, y: 1, z: 1 };
        // Sphere
        this.radius = 0.5;
        // Capsule
        this.height = 2;
        this.direction = 'y';
        // Physics material
        this.friction = 0.5;
        this.bounciness = 0;
        // Physics engine handle
        this.physicsHandle = null;
    }
}
exports.ColliderComponent = ColliderComponent;
/**
 * Audio Source component
 */
class AudioSourceComponent {
    constructor() {
        this.type = 'AudioSource';
        this.enabled = true;
        this.clipId = null;
        this.volume = 1;
        this.pitch = 1;
        this.loop = false;
        this.playOnAwake = false;
        this.spatialBlend = 0; // 0 = 2D, 1 = 3D
        this.minDistance = 1;
        this.maxDistance = 500;
        this.rolloffMode = 'logarithmic';
        // Runtime state
        this.isPlaying = false;
        this.time = 0;
    }
}
exports.AudioSourceComponent = AudioSourceComponent;
/**
 * Script component - holds behavior references
 */
class ScriptComponent {
    constructor() {
        this.type = 'Script';
        this.enabled = true;
        this.scriptId = null;
        this.properties = {};
    }
}
exports.ScriptComponent = ScriptComponent;
/**
 * Animator component
 */
class AnimatorComponent {
    constructor() {
        this.type = 'Animator';
        this.enabled = true;
        this.controllerId = null;
        this.speed = 1;
        this.applyRootMotion = false;
        // Runtime state
        this.currentState = null;
        this.parameters = new Map();
        this.layers = [];
    }
}
exports.AnimatorComponent = AnimatorComponent;
/**
 * UI Canvas component
 */
class CanvasComponent {
    constructor() {
        this.type = 'Canvas';
        this.enabled = true;
        this.renderMode = 'screen-space-overlay';
        this.sortOrder = 0;
        this.pixelPerfect = false;
        this.referenceResolution = { width: 1920, height: 1080 };
        this.scaleMode = 'scale-with-screen-size';
        this.matchWidthOrHeight = 0.5;
    }
}
exports.CanvasComponent = CanvasComponent;
const componentRegistry = new Map();
function registerComponent(type, constructor) {
    componentRegistry.set(type, constructor);
}
function createComponentInstance(type) {
    const constructor = componentRegistry.get(type);
    if (!constructor)
        return null;
    return new constructor();
}
// Register built-in components
registerComponent('Transform', TransformComponent);
registerComponent('MeshRenderer', MeshRendererComponent);
registerComponent('Camera', CameraComponent);
registerComponent('Light', LightComponent);
registerComponent('Rigidbody', RigidbodyComponent);
registerComponent('Collider', ColliderComponent);
registerComponent('AudioSource', AudioSourceComponent);
registerComponent('Script', ScriptComponent);
registerComponent('Animator', AnimatorComponent);
registerComponent('Canvas', CanvasComponent);
// ============================================================================
// ENTITY-COMPONENT-SYSTEM WORLD
// ============================================================================
let ECSWorld = class ECSWorld {
    constructor() {
        this.nextEntityId = 1;
        this.nextArchetypeId = 1;
        // Entity storage
        this.entities = new Map();
        this.recycledIds = [];
        // Component storage (sparse sets for cache efficiency)
        this.componentStores = new Map();
        // Archetype management
        this.archetypes = new Map();
        // Systems
        this.systems = [];
        this.systemsSorted = false;
        // Query cache
        this.queryCache = new Map();
        this.queryCacheDirty = true;
        // Events
        this.onEntityCreatedEmitter = new common_1.Emitter();
        this.onEntityDestroyedEmitter = new common_1.Emitter();
        this.onComponentAddedEmitter = new common_1.Emitter();
        this.onComponentRemovedEmitter = new common_1.Emitter();
        this.onEntityCreated = this.onEntityCreatedEmitter.event;
        this.onEntityDestroyed = this.onEntityDestroyedEmitter.event;
        this.onComponentAdded = this.onComponentAddedEmitter.event;
        this.onComponentRemoved = this.onComponentRemovedEmitter.event;
    }
    // ========================================================================
    // ENTITY MANAGEMENT
    // ========================================================================
    /**
     * Create a new entity
     */
    createEntity(descriptor = {}) {
        const id = this.recycledIds.pop() ?? this.nextEntityId++;
        const entityData = {
            id,
            name: descriptor.name ?? `Entity_${id}`,
            active: descriptor.active ?? true,
            parent: descriptor.parent ?? null,
            children: new Set(),
            tags: new Set(descriptor.tags ?? []),
            archetype: null
        };
        this.entities.set(id, entityData);
        // Add to parent's children
        if (entityData.parent !== null) {
            const parentData = this.entities.get(entityData.parent);
            if (parentData) {
                parentData.children.add(id);
            }
        }
        // Add default Transform component
        this.addComponent(id, new TransformComponent());
        // Add specified components
        if (descriptor.components) {
            for (const component of descriptor.components) {
                this.addComponent(id, component);
            }
        }
        this.queryCacheDirty = true;
        this.onEntityCreatedEmitter.fire({ entity: id });
        return id;
    }
    /**
     * Destroy an entity and all its components
     */
    destroyEntity(entityId) {
        const entityData = this.entities.get(entityId);
        if (!entityData)
            return;
        // Destroy children first (recursive)
        for (const childId of entityData.children) {
            this.destroyEntity(childId);
        }
        // Remove from parent
        if (entityData.parent !== null) {
            const parentData = this.entities.get(entityData.parent);
            if (parentData) {
                parentData.children.delete(entityId);
            }
        }
        // Remove all components
        for (const [type, store] of this.componentStores) {
            if (store.has(entityId)) {
                store.delete(entityId);
                this.onComponentRemovedEmitter.fire({ entity: entityId, component: type });
            }
        }
        // Remove from archetype
        if (entityData.archetype) {
            entityData.archetype.entities.delete(entityId);
        }
        // Remove entity
        this.entities.delete(entityId);
        this.recycledIds.push(entityId);
        this.queryCacheDirty = true;
        this.onEntityDestroyedEmitter.fire({ entity: entityId });
    }
    /**
     * Check if entity exists
     */
    hasEntity(entityId) {
        return this.entities.has(entityId);
    }
    /**
     * Get entity data
     */
    getEntityData(entityId) {
        return this.entities.get(entityId);
    }
    /**
     * Set entity active state
     */
    setEntityActive(entityId, active) {
        const entityData = this.entities.get(entityId);
        if (entityData) {
            entityData.active = active;
        }
    }
    /**
     * Get all entities
     */
    getAllEntities() {
        return Array.from(this.entities.keys());
    }
    /**
     * Get entity count
     */
    getEntityCount() {
        return this.entities.size;
    }
    // ========================================================================
    // COMPONENT MANAGEMENT
    // ========================================================================
    /**
     * Add a component to an entity
     */
    addComponent(entityId, component) {
        const entityData = this.entities.get(entityId);
        if (!entityData) {
            throw new Error(`Entity ${entityId} does not exist`);
        }
        let store = this.componentStores.get(component.type);
        if (!store) {
            store = new Map();
            this.componentStores.set(component.type, store);
        }
        store.set(entityId, component);
        // Update archetype
        this.updateEntityArchetype(entityId);
        this.queryCacheDirty = true;
        this.onComponentAddedEmitter.fire({ entity: entityId, component: component.type });
        return component;
    }
    /**
     * Remove a component from an entity
     */
    removeComponent(entityId, componentType) {
        const store = this.componentStores.get(componentType);
        if (!store || !store.has(entityId))
            return;
        store.delete(entityId);
        // Update archetype
        this.updateEntityArchetype(entityId);
        this.queryCacheDirty = true;
        this.onComponentRemovedEmitter.fire({ entity: entityId, component: componentType });
    }
    /**
     * Get a component from an entity
     */
    getComponent(entityId, componentType) {
        const store = this.componentStores.get(componentType);
        return store?.get(entityId);
    }
    /**
     * Check if entity has a component
     */
    hasComponent(entityId, componentType) {
        const store = this.componentStores.get(componentType);
        return store?.has(entityId) ?? false;
    }
    /**
     * Get all components of an entity
     */
    getComponents(entityId) {
        const components = [];
        for (const store of this.componentStores.values()) {
            const component = store.get(entityId);
            if (component) {
                components.push(component);
            }
        }
        return components;
    }
    /**
     * Get all components of a type
     */
    getAllComponentsOfType(componentType) {
        const store = this.componentStores.get(componentType);
        return (store ?? new Map());
    }
    // ========================================================================
    // ARCHETYPE MANAGEMENT
    // ========================================================================
    updateEntityArchetype(entityId) {
        const entityData = this.entities.get(entityId);
        if (!entityData)
            return;
        // Get component types for this entity
        const componentTypes = new Set();
        for (const [type, store] of this.componentStores) {
            if (store.has(entityId)) {
                componentTypes.add(type);
            }
        }
        // Find or create archetype
        const archetypeKey = Array.from(componentTypes).sort().join(',');
        // Remove from old archetype
        if (entityData.archetype) {
            entityData.archetype.entities.delete(entityId);
        }
        // Add to new archetype
        let archetype = this.archetypes.get(archetypeKey);
        if (!archetype) {
            archetype = {
                id: this.nextArchetypeId++,
                components: componentTypes,
                entities: new Set()
            };
            this.archetypes.set(archetypeKey, archetype);
        }
        archetype.entities.add(entityId);
        entityData.archetype = archetype;
    }
    // ========================================================================
    // QUERY SYSTEM
    // ========================================================================
    /**
     * Query entities by component requirements
     */
    query(query) {
        const cacheKey = JSON.stringify(query);
        if (!this.queryCacheDirty && this.queryCache.has(cacheKey)) {
            return Array.from(this.queryCache.get(cacheKey));
        }
        const results = new Set();
        for (const [entityId, entityData] of this.entities) {
            if (!entityData.active)
                continue;
            let matches = true;
            // All: must have all specified components
            if (query.all) {
                for (const type of query.all) {
                    if (!this.hasComponent(entityId, type)) {
                        matches = false;
                        break;
                    }
                }
            }
            // Any: must have at least one
            if (matches && query.any && query.any.length > 0) {
                let hasAny = false;
                for (const type of query.any) {
                    if (this.hasComponent(entityId, type)) {
                        hasAny = true;
                        break;
                    }
                }
                matches = hasAny;
            }
            // None: must not have any
            if (matches && query.none) {
                for (const type of query.none) {
                    if (this.hasComponent(entityId, type)) {
                        matches = false;
                        break;
                    }
                }
            }
            if (matches) {
                results.add(entityId);
            }
        }
        this.queryCache.set(cacheKey, results);
        return Array.from(results);
    }
    /**
     * Query entities by tag
     */
    queryByTag(tag) {
        const results = [];
        for (const [entityId, entityData] of this.entities) {
            if (entityData.tags.has(tag)) {
                results.push(entityId);
            }
        }
        return results;
    }
    /**
     * Query entities by name
     */
    queryByName(name) {
        for (const [entityId, entityData] of this.entities) {
            if (entityData.name === name) {
                return entityId;
            }
        }
        return undefined;
    }
    /**
     * Clear query cache
     */
    clearQueryCache() {
        this.queryCache.clear();
        this.queryCacheDirty = false;
    }
    // ========================================================================
    // SYSTEM MANAGEMENT
    // ========================================================================
    /**
     * Register a system
     */
    registerSystem(system) {
        this.systems.push(system);
        this.systemsSorted = false;
        if (system.initialize) {
            system.initialize();
        }
    }
    /**
     * Unregister a system
     */
    unregisterSystem(systemName) {
        const index = this.systems.findIndex(s => s.name === systemName);
        if (index !== -1) {
            const system = this.systems[index];
            if (system.destroy) {
                system.destroy();
            }
            this.systems.splice(index, 1);
        }
    }
    /**
     * Get a system by name
     */
    getSystem(name) {
        return this.systems.find(s => s.name === name);
    }
    /**
     * Sort systems by priority
     */
    sortSystems() {
        if (this.systemsSorted)
            return;
        this.systems.sort((a, b) => a.priority - b.priority);
        this.systemsSorted = true;
    }
    // ========================================================================
    // UPDATE LOOP
    // ========================================================================
    /**
     * Update all systems
     */
    update(deltaTime) {
        this.sortSystems();
        // Clear query cache if dirty
        if (this.queryCacheDirty) {
            this.clearQueryCache();
        }
        for (const system of this.systems) {
            if (!system.enabled)
                continue;
            const entities = this.query({ all: system.requiredComponents });
            try {
                system.update(entities, deltaTime);
            }
            catch (error) {
                console.error(`[ECS] Error in system ${system.name}:`, error);
            }
        }
    }
    /**
     * Fixed update all systems
     */
    fixedUpdate(deltaTime) {
        this.sortSystems();
        for (const system of this.systems) {
            if (!system.enabled || !system.fixedUpdate)
                continue;
            const entities = this.query({ all: system.requiredComponents });
            try {
                system.fixedUpdate(entities, deltaTime);
            }
            catch (error) {
                console.error(`[ECS] Error in system ${system.name} fixedUpdate:`, error);
            }
        }
    }
    /**
     * Late update all systems
     */
    lateUpdate(deltaTime) {
        this.sortSystems();
        for (const system of this.systems) {
            if (!system.enabled || !system.lateUpdate)
                continue;
            const entities = this.query({ all: system.requiredComponents });
            try {
                system.lateUpdate(entities, deltaTime);
            }
            catch (error) {
                console.error(`[ECS] Error in system ${system.name} lateUpdate:`, error);
            }
        }
    }
    // ========================================================================
    // SERIALIZATION
    // ========================================================================
    /**
     * Serialize world to JSON
     */
    serialize() {
        const data = {
            entities: []
        };
        for (const [entityId, entityData] of this.entities) {
            const components = this.getComponents(entityId).map(c => ({
                type: c.type,
                data: { ...c }
            }));
            data.entities.push({
                id: entityId,
                name: entityData.name,
                active: entityData.active,
                parent: entityData.parent,
                tags: Array.from(entityData.tags),
                components
            });
        }
        return JSON.stringify(data, null, 2);
    }
    /**
     * Deserialize world from JSON
     */
    deserialize(json) {
        const data = JSON.parse(json);
        // Clear current world
        this.clear();
        // Create entities
        for (const entityData of data.entities) {
            const id = this.createEntity({
                name: entityData.name,
                active: entityData.active,
                tags: entityData.tags
            });
            // Add components
            for (const compData of entityData.components) {
                const component = createComponentInstance(compData.type);
                if (component) {
                    Object.assign(component, compData.data);
                    this.addComponent(id, component);
                }
            }
        }
        // Set up parent relationships (second pass)
        for (const entityData of data.entities) {
            if (entityData.parent !== null) {
                const entity = this.entities.get(entityData.id);
                const parent = this.entities.get(entityData.parent);
                if (entity && parent) {
                    entity.parent = entityData.parent;
                    parent.children.add(entityData.id);
                }
            }
        }
    }
    /**
     * Clear all entities and reset
     */
    clear() {
        const entityIds = Array.from(this.entities.keys());
        for (const id of entityIds) {
            this.destroyEntity(id);
        }
        this.nextEntityId = 1;
        this.recycledIds.length = 0;
        this.queryCache.clear();
        this.queryCacheDirty = false;
    }
    // ========================================================================
    // CLEANUP
    // ========================================================================
    dispose() {
        // Destroy all systems
        for (const system of this.systems) {
            if (system.destroy) {
                system.destroy();
            }
        }
        this.systems.length = 0;
        // Clear all entities
        this.clear();
        // Dispose emitters
        this.onEntityCreatedEmitter.dispose();
        this.onEntityDestroyedEmitter.dispose();
        this.onComponentAddedEmitter.dispose();
        this.onComponentRemovedEmitter.dispose();
    }
};
exports.ECSWorld = ECSWorld;
exports.ECSWorld = ECSWorld = __decorate([
    (0, inversify_1.injectable)()
], ECSWorld);
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Create an entity with Transform at position
 */
function createEntityAtPosition(world, name, x, y, z) {
    const entity = world.createEntity({ name });
    const transform = world.getComponent(entity, 'Transform');
    if (transform) {
        transform.setPosition(x, y, z);
    }
    return entity;
}
/**
 * Create a camera entity
 */
function createCamera(world, name, fov = 60) {
    const entity = world.createEntity({ name });
    const camera = new CameraComponent();
    camera.fieldOfView = fov;
    world.addComponent(entity, camera);
    return entity;
}
/**
 * Create a light entity
 */
function createLight(world, name, type = 'point') {
    const entity = world.createEntity({ name });
    const light = new LightComponent();
    light.lightType = type;
    world.addComponent(entity, light);
    return entity;
}
