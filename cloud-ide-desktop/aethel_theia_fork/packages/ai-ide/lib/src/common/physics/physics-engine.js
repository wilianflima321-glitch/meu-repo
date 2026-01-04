"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsEngine = void 0;
/// <reference path="../types/rapier3d.d.ts" />
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
/**
 * Physics Engine - Rapier.js Integration
 */
let PhysicsEngine = class PhysicsEngine {
    constructor() {
        this.world = null;
        this.rapier = null;
        this.initialized = false;
        this.bodies = new Map();
        this.colliders = new Map();
        this.joints = new Map();
        this.entityBodies = new Map();
        this.controllers = new Map();
        this.config = {
            gravity: { x: 0, y: -9.81, z: 0 },
            timestep: 1 / 60,
            substeps: 1,
            maxVelocityIterations: 4,
            maxPositionIterations: 1,
            predictionDistance: 0.002,
            sleepEnabled: true,
        };
        this.accumulator = 0;
        this.debugOptions = {
            renderColliders: false,
            renderContacts: false,
            renderJoints: false,
            renderVelocities: false,
            renderAABBs: false,
        };
        // Events
        this.onCollisionStartEmitter = new common_1.Emitter();
        this.onCollisionEndEmitter = new common_1.Emitter();
        this.onBodyCreatedEmitter = new common_1.Emitter();
        this.onBodyRemovedEmitter = new common_1.Emitter();
        this.onStepEmitter = new common_1.Emitter();
        this.onCollisionStart = this.onCollisionStartEmitter.event;
        this.onCollisionEnd = this.onCollisionEndEmitter.event;
        this.onBodyCreated = this.onBodyCreatedEmitter.event;
        this.onBodyRemoved = this.onBodyRemovedEmitter.event;
        this.onStep = this.onStepEmitter.event;
    }
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    /**
     * Initialize the physics engine
     */
    async initialize(config) {
        if (this.initialized)
            return;
        // Import Rapier (dynamic import for WASM)
        try {
            this.rapier = await Promise.resolve().then(() => __importStar(require('@dimforge/rapier3d')));
            await this.rapier.init();
        }
        catch (error) {
            // Fallback to basic physics simulation if Rapier not available
            console.warn('Rapier not available, using fallback physics');
            this.initializeFallback();
            return;
        }
        if (config) {
            this.config = { ...this.config, ...config };
        }
        // Create physics world
        const gravity = {
            x: this.config.gravity.x,
            y: this.config.gravity.y,
            z: this.config.gravity.z
        };
        this.world = new this.rapier.World(gravity);
        if (this.world) {
            this.world.timestep = this.config.timestep;
            this.world.numSolverIterations = this.config.maxVelocityIterations;
        }
        this.initialized = true;
    }
    /**
     * Initialize fallback physics (basic simulation without Rapier)
     */
    initializeFallback() {
        this.world = new FallbackPhysicsWorld(this.config);
        this.initialized = true;
    }
    /**
     * Check if engine is ready
     */
    isReady() {
        return this.initialized && this.world !== null;
    }
    /**
     * Dispose the physics engine
     */
    dispose() {
        if (this.world) {
            this.world.free?.();
            this.world = null;
        }
        this.bodies.clear();
        this.colliders.clear();
        this.joints.clear();
        this.entityBodies.clear();
        this.controllers.clear();
        this.initialized = false;
    }
    // ========================================================================
    // SIMULATION
    // ========================================================================
    /**
     * Step the physics simulation
     */
    step(deltaTime) {
        if (!this.world)
            return;
        // Fixed timestep with accumulator
        this.accumulator += deltaTime;
        while (this.accumulator >= this.config.timestep) {
            this.world.step();
            this.accumulator -= this.config.timestep;
            this.processCollisionEvents();
        }
        this.onStepEmitter.fire(deltaTime);
    }
    /**
     * Process collision events from the physics world
     */
    processCollisionEvents() {
        if (!this.world || !this.rapier)
            return;
        // Get event queue
        const eventQueue = this.world.eventQueue;
        if (!eventQueue)
            return;
        eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            const collider1 = this.colliders.get(handle1);
            const collider2 = this.colliders.get(handle2);
            if (collider1 && collider2) {
                const event = {
                    type: started ? 'start' : 'end',
                    collider1,
                    collider2,
                };
                if (started) {
                    this.onCollisionStartEmitter.fire(event);
                }
                else {
                    this.onCollisionEndEmitter.fire(event);
                }
            }
        });
    }
    // ========================================================================
    // RIGID BODY MANAGEMENT
    // ========================================================================
    /**
     * Create a rigid body
     */
    createRigidBody(entityId, descriptor) {
        if (!this.world || !this.rapier)
            return null;
        // Create body descriptor
        let bodyDesc;
        switch (descriptor.type) {
            case 'dynamic':
                bodyDesc = this.rapier.RigidBodyDesc.dynamic();
                break;
            case 'static':
                bodyDesc = this.rapier.RigidBodyDesc.fixed();
                break;
            case 'kinematic-position':
                bodyDesc = this.rapier.RigidBodyDesc.kinematicPositionBased();
                break;
            case 'kinematic-velocity':
                bodyDesc = this.rapier.RigidBodyDesc.kinematicVelocityBased();
                break;
            default:
                bodyDesc = this.rapier.RigidBodyDesc.dynamic();
        }
        // Set position
        bodyDesc.setTranslation(descriptor.position.x, descriptor.position.y, descriptor.position.z);
        // Set rotation
        if (descriptor.rotation) {
            bodyDesc.setRotation({
                x: descriptor.rotation.x,
                y: descriptor.rotation.y,
                z: descriptor.rotation.z,
                w: descriptor.rotation.w,
            });
        }
        // Set velocities
        if (descriptor.linearVelocity) {
            bodyDesc.setLinvel(descriptor.linearVelocity.x, descriptor.linearVelocity.y, descriptor.linearVelocity.z);
        }
        if (descriptor.angularVelocity) {
            bodyDesc.setAngvel({
                x: descriptor.angularVelocity.x,
                y: descriptor.angularVelocity.y,
                z: descriptor.angularVelocity.z,
            });
        }
        // Set other properties
        if (descriptor.gravityScale !== undefined) {
            bodyDesc.setGravityScale(descriptor.gravityScale);
        }
        if (descriptor.linearDamping !== undefined) {
            bodyDesc.setLinearDamping(descriptor.linearDamping);
        }
        if (descriptor.angularDamping !== undefined) {
            bodyDesc.setAngularDamping(descriptor.angularDamping);
        }
        if (descriptor.canSleep !== undefined) {
            bodyDesc.setCanSleep(descriptor.canSleep);
        }
        if (descriptor.ccd) {
            bodyDesc.setCcdEnabled(true);
        }
        // Create body
        const body = this.world.createRigidBody(bodyDesc);
        const handle = {
            id: body.handle,
            entityId,
        };
        this.bodies.set(body.handle, handle);
        this.entityBodies.set(entityId, body.handle);
        this.onBodyCreatedEmitter.fire(handle);
        return handle;
    }
    /**
     * Remove a rigid body
     */
    removeRigidBody(handle) {
        if (!this.world)
            return;
        const body = this.world.getRigidBody(handle.id);
        if (body) {
            this.world.removeRigidBody(body);
        }
        this.bodies.delete(handle.id);
        this.entityBodies.delete(handle.entityId);
        this.onBodyRemovedEmitter.fire(handle.id);
    }
    /**
     * Get rigid body by entity ID
     */
    getRigidBodyByEntity(entityId) {
        const bodyId = this.entityBodies.get(entityId);
        return bodyId !== undefined ? this.bodies.get(bodyId) : undefined;
    }
    /**
     * Get rigid body transform
     */
    getBodyTransform(handle) {
        if (!this.world)
            return null;
        const body = this.world.getRigidBody(handle.id);
        if (!body)
            return null;
        const position = body.translation();
        const rotation = body.rotation();
        return {
            position: { x: position.x, y: position.y, z: position.z },
            rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
        };
    }
    /**
     * Set rigid body transform
     */
    setBodyTransform(handle, transform) {
        if (!this.world)
            return;
        const body = this.world.getRigidBody(handle.id);
        if (!body)
            return;
        if (transform.position) {
            body.setTranslation({ x: transform.position.x, y: transform.position.y, z: transform.position.z }, true);
        }
        if (transform.rotation) {
            body.setRotation(transform.rotation, true);
        }
    }
    /**
     * Apply force to body
     */
    applyForce(handle, force, wakeUp = true) {
        if (!this.world)
            return;
        const body = this.world.getRigidBody(handle.id);
        if (!body)
            return;
        body.addForce({ x: force.x, y: force.y, z: force.z }, wakeUp);
    }
    /**
     * Apply impulse to body
     */
    applyImpulse(handle, impulse, wakeUp = true) {
        if (!this.world)
            return;
        const body = this.world.getRigidBody(handle.id);
        if (!body)
            return;
        body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, wakeUp);
    }
    /**
     * Apply torque to body
     */
    applyTorque(handle, torque, wakeUp = true) {
        if (!this.world)
            return;
        const body = this.world.getRigidBody(handle.id);
        if (!body)
            return;
        body.addTorque({ x: torque.x, y: torque.y, z: torque.z }, wakeUp);
    }
    /**
     * Set linear velocity
     */
    setLinearVelocity(handle, velocity) {
        if (!this.world)
            return;
        const body = this.world.getRigidBody(handle.id);
        if (!body)
            return;
        body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    }
    /**
     * Get linear velocity
     */
    getLinearVelocity(handle) {
        if (!this.world)
            return null;
        const body = this.world.getRigidBody(handle.id);
        if (!body)
            return null;
        const vel = body.linvel();
        return { x: vel.x, y: vel.y, z: vel.z };
    }
    /**
     * Set angular velocity
     */
    setAngularVelocity(handle, velocity) {
        if (!this.world)
            return;
        const body = this.world.getRigidBody(handle.id);
        if (!body)
            return;
        body.setAngvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    }
    // ========================================================================
    // COLLIDER MANAGEMENT
    // ========================================================================
    /**
     * Create a collider and attach to body
     */
    createCollider(entityId, bodyHandle, descriptor) {
        if (!this.world || !this.rapier)
            return null;
        const body = this.world.getRigidBody(bodyHandle.id);
        if (!body)
            return null;
        // Create collider shape
        let colliderDesc;
        switch (descriptor.shape) {
            case 'box':
                colliderDesc = this.rapier.ColliderDesc.cuboid(descriptor.halfExtents?.x || 0.5, descriptor.halfExtents?.y || 0.5, descriptor.halfExtents?.z || 0.5);
                break;
            case 'sphere':
                colliderDesc = this.rapier.ColliderDesc.ball(descriptor.radius || 0.5);
                break;
            case 'capsule':
                colliderDesc = this.rapier.ColliderDesc.capsule(descriptor.halfHeight || 0.5, descriptor.radius || 0.25);
                break;
            case 'cylinder':
                colliderDesc = this.rapier.ColliderDesc.cylinder(descriptor.halfHeight || 0.5, descriptor.radius || 0.5);
                break;
            case 'cone':
                colliderDesc = this.rapier.ColliderDesc.cone(descriptor.halfHeight || 0.5, descriptor.radius || 0.5);
                break;
            case 'convex-hull':
                if (!descriptor.vertices) {
                    return null;
                }
                colliderDesc = this.rapier.ColliderDesc.convexHull(descriptor.vertices);
                if (!colliderDesc)
                    return null;
                break;
            case 'trimesh':
                if (!descriptor.vertices || !descriptor.indices) {
                    return null;
                }
                colliderDesc = this.rapier.ColliderDesc.trimesh(descriptor.vertices, descriptor.indices);
                break;
            case 'heightfield':
                if (!descriptor.heights || !descriptor.rows || !descriptor.cols) {
                    return null;
                }
                colliderDesc = this.rapier.ColliderDesc.heightfield(descriptor.rows, descriptor.cols, descriptor.heights, { x: 1, y: 1, z: 1 });
                break;
            default:
                colliderDesc = this.rapier.ColliderDesc.ball(0.5);
        }
        // Set physics properties
        if (descriptor.density !== undefined) {
            colliderDesc.setDensity(descriptor.density);
        }
        if (descriptor.friction !== undefined) {
            colliderDesc.setFriction(descriptor.friction);
        }
        if (descriptor.restitution !== undefined) {
            colliderDesc.setRestitution(descriptor.restitution);
        }
        if (descriptor.isSensor) {
            colliderDesc.setSensor(true);
        }
        if (descriptor.collisionGroups) {
            colliderDesc.setCollisionGroups((descriptor.collisionGroups.memberships << 16) | descriptor.collisionGroups.filter);
        }
        if (descriptor.offset) {
            colliderDesc.setTranslation(descriptor.offset.x, descriptor.offset.y, descriptor.offset.z);
        }
        if (descriptor.rotation) {
            colliderDesc.setRotation(descriptor.rotation);
        }
        // Create collider
        const collider = this.world.createCollider(colliderDesc, body);
        const handle = {
            id: collider.handle,
            bodyId: bodyHandle.id,
            entityId,
        };
        this.colliders.set(collider.handle, handle);
        return handle;
    }
    /**
     * Remove a collider
     */
    removeCollider(handle) {
        if (!this.world)
            return;
        const collider = this.world.getCollider(handle.id);
        if (collider) {
            this.world.removeCollider(collider, true);
        }
        this.colliders.delete(handle.id);
    }
    // ========================================================================
    // QUERIES
    // ========================================================================
    /**
     * Cast a ray and get the first hit
     */
    raycast(origin, direction, maxDistance, filterMask) {
        if (!this.world || !this.rapier)
            return null;
        const ray = new this.rapier.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: direction.x, y: direction.y, z: direction.z });
        const hit = this.world.castRay(ray, maxDistance, true, filterMask);
        if (hit) {
            const collider = this.world.getCollider(hit.collider.handle);
            const colliderHandle = this.colliders.get(hit.collider.handle);
            const point = ray.pointAt(hit.toi);
            const normal = hit.normal;
            return {
                point: { x: point.x, y: point.y, z: point.z },
                normal: { x: normal.x, y: normal.y, z: normal.z },
                distance: hit.toi,
                colliderId: hit.collider.handle,
                entityId: colliderHandle?.entityId || '',
            };
        }
        return null;
    }
    /**
     * Cast a ray and get all hits
     */
    raycastAll(origin, direction, maxDistance, filterMask) {
        if (!this.world || !this.rapier)
            return [];
        const ray = new this.rapier.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: direction.x, y: direction.y, z: direction.z });
        const hits = [];
        this.world.intersectionsWithRay(ray, maxDistance, true, (hit) => {
            const colliderHandle = this.colliders.get(hit.collider.handle);
            const point = ray.pointAt(hit.toi);
            const normal = hit.normal;
            hits.push({
                point: { x: point.x, y: point.y, z: point.z },
                normal: { x: normal.x, y: normal.y, z: normal.z },
                distance: hit.toi,
                colliderId: hit.collider.handle,
                entityId: colliderHandle?.entityId || '',
            });
            return true; // Continue searching
        }, filterMask);
        return hits;
    }
    /**
     * Check if a point is inside any collider
     */
    pointInCollider(point) {
        if (!this.world)
            return null;
        const collider = this.world.intersectionsWithPoint({ x: point.x, y: point.y, z: point.z }, () => false);
        if (collider) {
            return this.colliders.get(collider.handle) || null;
        }
        return null;
    }
    /**
     * Query colliders overlapping with a shape
     */
    overlapShape(position, rotation, shape) {
        if (!this.world || !this.rapier)
            return [];
        // Create shape for query
        let queryShape;
        switch (shape.shape) {
            case 'box':
                queryShape = new this.rapier.Cuboid(shape.halfExtents?.x || 0.5, shape.halfExtents?.y || 0.5, shape.halfExtents?.z || 0.5);
                break;
            case 'sphere':
                queryShape = new this.rapier.Ball(shape.radius || 0.5);
                break;
            default:
                queryShape = new this.rapier.Ball(0.5);
        }
        const results = [];
        this.world.intersectionsWithShape({ x: position.x, y: position.y, z: position.z }, rotation, queryShape, (collider) => {
            const handle = this.colliders.get(collider.handle);
            if (handle) {
                results.push(handle);
            }
            return true; // Continue searching
        });
        return results;
    }
    // ========================================================================
    // JOINTS
    // ========================================================================
    /**
     * Create a joint between two bodies
     */
    createJoint(descriptor) {
        if (!this.world || !this.rapier)
            return null;
        const body1 = this.world.getRigidBody(descriptor.body1.id);
        const body2 = this.world.getRigidBody(descriptor.body2.id);
        if (!body1 || !body2)
            return null;
        let jointData;
        const anchor1 = descriptor.anchor1 || { x: 0, y: 0, z: 0 };
        const anchor2 = descriptor.anchor2 || { x: 0, y: 0, z: 0 };
        switch (descriptor.type) {
            case 'fixed':
                jointData = this.rapier.JointData.fixed(anchor1, { x: 0, y: 0, z: 0, w: 1 }, anchor2, { x: 0, y: 0, z: 0, w: 1 });
                break;
            case 'revolute':
                jointData = this.rapier.JointData.revolute(anchor1, anchor2, descriptor.axis || { x: 0, y: 1, z: 0 });
                if (descriptor.limits) {
                    jointData.limitsEnabled = true;
                    jointData.limits = [descriptor.limits.min, descriptor.limits.max];
                }
                break;
            case 'prismatic':
                jointData = this.rapier.JointData.prismatic(anchor1, anchor2, descriptor.axis || { x: 1, y: 0, z: 0 });
                if (descriptor.limits) {
                    jointData.limitsEnabled = true;
                    jointData.limits = [descriptor.limits.min, descriptor.limits.max];
                }
                break;
            case 'spherical':
                jointData = this.rapier.JointData.spherical(anchor1, anchor2);
                break;
            case 'rope':
                jointData = this.rapier.JointData.rope(descriptor.limits?.max || 1, anchor1, anchor2);
                break;
            case 'spring':
                jointData = this.rapier.JointData.spring(descriptor.stiffness || 1000, descriptor.damping || 10, anchor1, anchor2);
                break;
            default:
                jointData = this.rapier.JointData.fixed(anchor1, { x: 0, y: 0, z: 0, w: 1 }, anchor2, { x: 0, y: 0, z: 0, w: 1 });
        }
        const joint = this.world.createImpulseJoint(jointData, body1, body2, true);
        const handle = {
            id: joint.handle,
            body1Id: descriptor.body1.id,
            body2Id: descriptor.body2.id,
        };
        this.joints.set(joint.handle, handle);
        return handle;
    }
    /**
     * Remove a joint
     */
    removeJoint(handle) {
        if (!this.world)
            return;
        const joint = this.world.getImpulseJoint(handle.id);
        if (joint) {
            this.world.removeImpulseJoint(joint, true);
        }
        this.joints.delete(handle.id);
    }
    // ========================================================================
    // CHARACTER CONTROLLER
    // ========================================================================
    /**
     * Create a character controller
     */
    createCharacterController(entityId, descriptor) {
        if (!this.world || !this.rapier)
            return null;
        const controller = this.world.createCharacterController(descriptor.offset);
        // Configure autostep
        if (descriptor.autostep) {
            controller.enableAutostep(descriptor.autostep.maxHeight, descriptor.autostep.minWidth, descriptor.autostep.includeDynamic);
        }
        // Configure slope
        controller.setMaxSlopeClimbAngle(descriptor.maxSlopeAngle * (Math.PI / 180));
        if (descriptor.minSlopeAngle !== undefined) {
            controller.setMinSlopeSlideAngle(descriptor.minSlopeAngle * (Math.PI / 180));
        }
        // Configure snap to ground
        if (descriptor.snapToGround !== undefined) {
            controller.enableSnapToGround(descriptor.snapToGround);
        }
        const handle = {
            id: entityId,
            controller,
            collider: null,
        };
        this.controllers.set(entityId, handle);
        return handle;
    }
    /**
     * Move character controller
     */
    moveCharacter(controller, desiredMovement, deltaTime) {
        if (!this.world || !controller.collider)
            return { x: 0, y: 0, z: 0 };
        const collider = this.world.getCollider(controller.collider.id);
        if (!collider)
            return { x: 0, y: 0, z: 0 };
        controller.controller.computeColliderMovement(collider, { x: desiredMovement.x, y: desiredMovement.y, z: desiredMovement.z });
        const movement = controller.controller.computedMovement();
        return { x: movement.x, y: movement.y, z: movement.z };
    }
    /**
     * Check if character is grounded
     */
    isCharacterGrounded(controller) {
        return controller.controller.computedGrounded();
    }
    // ========================================================================
    // DEBUG RENDERING
    // ========================================================================
    /**
     * Get debug render data
     */
    getDebugRenderData() {
        if (!this.world)
            return null;
        const buffers = this.world.debugRender();
        return {
            vertices: buffers.vertices,
            colors: buffers.colors,
        };
    }
    /**
     * Set debug options
     */
    setDebugOptions(options) {
        this.debugOptions = { ...this.debugOptions, ...options };
    }
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    /**
     * Set gravity
     */
    setGravity(gravity) {
        if (!this.world)
            return;
        this.world.gravity = { x: gravity.x, y: gravity.y, z: gravity.z };
        this.config.gravity = gravity;
    }
    /**
     * Get current gravity
     */
    getGravity() {
        return this.config.gravity;
    }
    /**
     * Get all bodies
     */
    getAllBodies() {
        return Array.from(this.bodies.values());
    }
    /**
     * Get all colliders
     */
    getAllColliders() {
        return Array.from(this.colliders.values());
    }
};
exports.PhysicsEngine = PhysicsEngine;
exports.PhysicsEngine = PhysicsEngine = __decorate([
    (0, inversify_1.injectable)()
], PhysicsEngine);
// ============================================================================
// FALLBACK PHYSICS (Basic simulation without Rapier)
// ============================================================================
class FallbackPhysicsWorld {
    constructor(config) {
        this.bodies = new Map();
        this.nextHandle = 0;
        this.numSolverIterations = 4;
        this.gravity = config.gravity;
        this.timestep = config.timestep;
    }
    step() {
        for (const body of this.bodies.values()) {
            if (body.type === 'dynamic') {
                // Apply gravity
                body.velocity.y += this.gravity.y * this.timestep;
                // Update position
                body.position.x += body.velocity.x * this.timestep;
                body.position.y += body.velocity.y * this.timestep;
                body.position.z += body.velocity.z * this.timestep;
                // Simple ground collision
                if (body.position.y < 0) {
                    body.position.y = 0;
                    body.velocity.y = 0;
                }
            }
        }
    }
    free() {
        this.bodies.clear();
    }
    createRigidBody(desc) {
        const handle = this.nextHandle++;
        const body = {
            handle,
            type: 'dynamic',
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            angularVelocity: { x: 0, y: 0, z: 0 },
        };
        this.bodies.set(handle, body);
        return body;
    }
    getRigidBody(handle) {
        const body = this.bodies.get(handle);
        return body || null;
    }
    removeRigidBody(body) {
        this.bodies.delete(body.handle);
    }
    createCollider() {
        return { handle: this.nextHandle++ };
    }
    getCollider() {
        return null;
    }
    removeCollider() { }
    castRay() {
        return null;
    }
    intersectionsWithRay() { }
    intersectionsWithPoint() {
        return null;
    }
    intersectionsWithShape() { }
    createImpulseJoint() {
        return { handle: this.nextHandle++ };
    }
    getImpulseJoint() {
        return null;
    }
    removeImpulseJoint() { }
    createCharacterController() {
        return {
            enableAutostep: () => { },
            setMaxSlopeClimbAngle: () => { },
            setMinSlopeSlideAngle: () => { },
            enableSnapToGround: () => { },
            computeColliderMovement: () => { },
            computedMovement: () => ({ x: 0, y: 0, z: 0 }),
            computedGrounded: () => true,
        };
    }
    debugRender() {
        return { vertices: new Float32Array(0), colors: new Float32Array(0) };
    }
}
exports.default = PhysicsEngine;
