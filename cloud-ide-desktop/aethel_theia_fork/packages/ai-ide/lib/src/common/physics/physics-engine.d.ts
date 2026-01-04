import { Event } from '@theia/core/lib/common';
/**
 * Vector3 type
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
/**
 * Quaternion type
 */
export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}
/**
 * Transform containing position and rotation
 */
export interface Transform {
    position: Vector3;
    rotation: Quaternion;
}
/**
 * Rigid body types
 */
export type RigidBodyType = 'dynamic' | 'static' | 'kinematic-position' | 'kinematic-velocity';
/**
 * Collider shapes
 */
export type ColliderShape = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'cone' | 'convex-hull' | 'trimesh' | 'heightfield';
/**
 * Collision group for filtering
 */
export interface CollisionGroups {
    memberships: number;
    filter: number;
}
/**
 * Rigid body descriptor
 */
export interface RigidBodyDescriptor {
    type: RigidBodyType;
    position: Vector3;
    rotation?: Quaternion;
    linearVelocity?: Vector3;
    angularVelocity?: Vector3;
    gravityScale?: number;
    linearDamping?: number;
    angularDamping?: number;
    canSleep?: boolean;
    ccd?: boolean;
    userData?: unknown;
}
/**
 * Collider descriptor
 */
export interface ColliderDescriptor {
    shape: ColliderShape;
    halfExtents?: Vector3;
    radius?: number;
    halfHeight?: number;
    vertices?: Float32Array;
    indices?: Uint32Array;
    heights?: Float32Array;
    rows?: number;
    cols?: number;
    density?: number;
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    collisionGroups?: CollisionGroups;
    offset?: Vector3;
    rotation?: Quaternion;
    userData?: unknown;
}
/**
 * Rigid body handle
 */
export interface RigidBodyHandle {
    id: number;
    entityId: string;
}
/**
 * Collider handle
 */
export interface ColliderHandle {
    id: number;
    bodyId: number;
    entityId: string;
}
/**
 * Raycast hit result
 */
export interface RaycastHit {
    point: Vector3;
    normal: Vector3;
    distance: number;
    colliderId: number;
    entityId: string;
}
/**
 * Contact point between colliders
 */
export interface ContactPoint {
    point: Vector3;
    normal: Vector3;
    penetration: number;
}
/**
 * Collision event
 */
export interface CollisionEvent {
    type: 'start' | 'end';
    collider1: ColliderHandle;
    collider2: ColliderHandle;
    contacts?: ContactPoint[];
}
/**
 * Character controller descriptor
 */
export interface CharacterControllerDescriptor {
    offset: number;
    stepHeight: number;
    maxSlopeAngle: number;
    minSlopeAngle?: number;
    snapToGround?: number;
    autostep?: {
        maxHeight: number;
        minWidth: number;
        includeDynamic: boolean;
    };
}
/**
 * Joint types
 */
export type JointType = 'fixed' | 'revolute' | 'prismatic' | 'spherical' | 'rope' | 'spring';
/**
 * Joint descriptor
 */
export interface JointDescriptor {
    type: JointType;
    body1: RigidBodyHandle;
    body2: RigidBodyHandle;
    anchor1?: Vector3;
    anchor2?: Vector3;
    axis?: Vector3;
    limits?: {
        min: number;
        max: number;
    };
    motor?: {
        targetVelocity: number;
        maxForce: number;
    };
    stiffness?: number;
    damping?: number;
}
/**
 * Physics world configuration
 */
export interface PhysicsWorldConfig {
    gravity: Vector3;
    timestep: number;
    substeps: number;
    maxVelocityIterations: number;
    maxPositionIterations: number;
    predictionDistance: number;
    sleepEnabled: boolean;
}
/**
 * Physics debug renderer options
 */
export interface PhysicsDebugOptions {
    renderColliders: boolean;
    renderContacts: boolean;
    renderJoints: boolean;
    renderVelocities: boolean;
    renderAABBs: boolean;
}
/**
 * Physics Engine - Rapier.js Integration
 */
export declare class PhysicsEngine {
    private world;
    private rapier;
    private initialized;
    private readonly bodies;
    private readonly colliders;
    private readonly joints;
    private readonly entityBodies;
    private readonly controllers;
    private config;
    private accumulator;
    private debugOptions;
    private readonly onCollisionStartEmitter;
    private readonly onCollisionEndEmitter;
    private readonly onBodyCreatedEmitter;
    private readonly onBodyRemovedEmitter;
    private readonly onStepEmitter;
    readonly onCollisionStart: Event<CollisionEvent>;
    readonly onCollisionEnd: Event<CollisionEvent>;
    readonly onBodyCreated: Event<RigidBodyHandle>;
    readonly onBodyRemoved: Event<number>;
    readonly onStep: Event<number>;
    /**
     * Initialize the physics engine
     */
    initialize(config?: Partial<PhysicsWorldConfig>): Promise<void>;
    /**
     * Initialize fallback physics (basic simulation without Rapier)
     */
    private initializeFallback;
    /**
     * Check if engine is ready
     */
    isReady(): boolean;
    /**
     * Dispose the physics engine
     */
    dispose(): void;
    /**
     * Step the physics simulation
     */
    step(deltaTime: number): void;
    /**
     * Process collision events from the physics world
     */
    private processCollisionEvents;
    /**
     * Create a rigid body
     */
    createRigidBody(entityId: string, descriptor: RigidBodyDescriptor): RigidBodyHandle | null;
    /**
     * Remove a rigid body
     */
    removeRigidBody(handle: RigidBodyHandle): void;
    /**
     * Get rigid body by entity ID
     */
    getRigidBodyByEntity(entityId: string): RigidBodyHandle | undefined;
    /**
     * Get rigid body transform
     */
    getBodyTransform(handle: RigidBodyHandle): Transform | null;
    /**
     * Set rigid body transform
     */
    setBodyTransform(handle: RigidBodyHandle, transform: Partial<Transform>): void;
    /**
     * Apply force to body
     */
    applyForce(handle: RigidBodyHandle, force: Vector3, wakeUp?: boolean): void;
    /**
     * Apply impulse to body
     */
    applyImpulse(handle: RigidBodyHandle, impulse: Vector3, wakeUp?: boolean): void;
    /**
     * Apply torque to body
     */
    applyTorque(handle: RigidBodyHandle, torque: Vector3, wakeUp?: boolean): void;
    /**
     * Set linear velocity
     */
    setLinearVelocity(handle: RigidBodyHandle, velocity: Vector3): void;
    /**
     * Get linear velocity
     */
    getLinearVelocity(handle: RigidBodyHandle): Vector3 | null;
    /**
     * Set angular velocity
     */
    setAngularVelocity(handle: RigidBodyHandle, velocity: Vector3): void;
    /**
     * Create a collider and attach to body
     */
    createCollider(entityId: string, bodyHandle: RigidBodyHandle, descriptor: ColliderDescriptor): ColliderHandle | null;
    /**
     * Remove a collider
     */
    removeCollider(handle: ColliderHandle): void;
    /**
     * Cast a ray and get the first hit
     */
    raycast(origin: Vector3, direction: Vector3, maxDistance: number, filterMask?: number): RaycastHit | null;
    /**
     * Cast a ray and get all hits
     */
    raycastAll(origin: Vector3, direction: Vector3, maxDistance: number, filterMask?: number): RaycastHit[];
    /**
     * Check if a point is inside any collider
     */
    pointInCollider(point: Vector3): ColliderHandle | null;
    /**
     * Query colliders overlapping with a shape
     */
    overlapShape(position: Vector3, rotation: Quaternion, shape: ColliderDescriptor): ColliderHandle[];
    /**
     * Create a joint between two bodies
     */
    createJoint(descriptor: JointDescriptor): JointHandle | null;
    /**
     * Remove a joint
     */
    removeJoint(handle: JointHandle): void;
    /**
     * Create a character controller
     */
    createCharacterController(entityId: string, descriptor: CharacterControllerDescriptor): CharacterController | null;
    /**
     * Move character controller
     */
    moveCharacter(controller: CharacterController, desiredMovement: Vector3, deltaTime: number): Vector3;
    /**
     * Check if character is grounded
     */
    isCharacterGrounded(controller: CharacterController): boolean;
    /**
     * Get debug render data
     */
    getDebugRenderData(): {
        vertices: Float32Array;
        colors: Float32Array;
    } | null;
    /**
     * Set debug options
     */
    setDebugOptions(options: Partial<PhysicsDebugOptions>): void;
    /**
     * Set gravity
     */
    setGravity(gravity: Vector3): void;
    /**
     * Get current gravity
     */
    getGravity(): Vector3;
    /**
     * Get all bodies
     */
    getAllBodies(): RigidBodyHandle[];
    /**
     * Get all colliders
     */
    getAllColliders(): ColliderHandle[];
}
interface RapierCollider {
    handle: number;
}
interface RapierCharacterController {
    enableAutostep(maxHeight: number, minWidth: number, includeDynamic: boolean): void;
    setMaxSlopeClimbAngle(angle: number): void;
    setMinSlopeSlideAngle(angle: number): void;
    enableSnapToGround(distance: number): void;
    computeColliderMovement(collider: RapierCollider, movement: Vector3): void;
    computedMovement(): Vector3;
    computedGrounded(): boolean;
}
interface JointHandle {
    id: number;
    body1Id: number;
    body2Id: number;
}
interface CharacterController {
    id: string;
    controller: RapierCharacterController;
    collider: ColliderHandle;
}
export default PhysicsEngine;
