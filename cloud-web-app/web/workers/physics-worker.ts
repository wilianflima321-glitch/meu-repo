/**
 * AETHEL ENGINE - Physics Web Worker
 * 
 * Off-thread physics simulation using Rapier.
 * Handles collision detection, rigid body dynamics, and raycasting.
 */

import RAPIER from '@dimforge/rapier3d-compat';

// ============================================================================
// TYPES
// ============================================================================

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

interface RigidBodyConfig {
    id: string;
    type: 'dynamic' | 'kinematic' | 'fixed';
    position: Vector3;
    rotation?: Quaternion;
    mass?: number;
    linearDamping?: number;
    angularDamping?: number;
    gravityScale?: number;
    canSleep?: boolean;
    ccd?: boolean; // Continuous collision detection
}

interface ColliderConfig {
    id: string;
    bodyId: string;
    shape: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'cone' | 'convex' | 'trimesh';
    size: Vector3 | number | { radius: number; height: number };
    offset?: Vector3;
    rotation?: Quaternion;
    friction?: number;
    restitution?: number;
    density?: number;
    isSensor?: boolean;
    collisionGroups?: number;
}

interface PhysicsState {
    bodies: Map<string, {
        position: Vector3;
        rotation: Quaternion;
        linearVelocity: Vector3;
        angularVelocity: Vector3;
    }>;
}

interface RaycastHit {
    bodyId: string;
    point: Vector3;
    normal: Vector3;
    distance: number;
}

interface ContactEvent {
    type: 'start' | 'end';
    body1: string;
    body2: string;
    contacts: { point: Vector3; normal: Vector3; depth: number }[];
}

interface WorkerMessage {
    type: 'init' | 'step' | 'addBody' | 'removeBody' | 'addCollider' | 'removeCollider' |
          'setPosition' | 'setRotation' | 'applyForce' | 'applyImpulse' | 'applyTorque' |
          'setVelocity' | 'raycast' | 'shapecast' | 'setGravity' | 'getState' | 'destroy';
    id: string;
    data?: any;
}

interface WorkerResponse {
    type: string;
    id: string;
    success: boolean;
    data?: any;
    error?: string;
}

// ============================================================================
// PHYSICS WORLD
// ============================================================================

let world: RAPIER.World | null = null;
let eventQueue: RAPIER.EventQueue | null = null;

const bodyHandles = new Map<string, RAPIER.RigidBodyHandle>();
const handleToId = new Map<number, string>();
const colliderHandles = new Map<string, RAPIER.ColliderHandle>();
const colliderToBody = new Map<string, string>();

let lastStepTime = 0;
let accumulator = 0;
const FIXED_TIMESTEP = 1 / 60; // 60 Hz physics

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initPhysics(gravity: Vector3 = { x: 0, y: -9.81, z: 0 }): Promise<void> {
    await RAPIER.init();
    
    world = new RAPIER.World(gravity);
    eventQueue = new RAPIER.EventQueue(true);
    
    console.log('[PhysicsWorker] Rapier initialized');
}

// ============================================================================
// BODY MANAGEMENT
// ============================================================================

function addRigidBody(config: RigidBodyConfig): void {
    if (!world) throw new Error('Physics not initialized');
    
    let bodyDesc: RAPIER.RigidBodyDesc;
    
    switch (config.type) {
        case 'dynamic':
            bodyDesc = RAPIER.RigidBodyDesc.dynamic();
            break;
        case 'kinematic':
            bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
            break;
        case 'fixed':
            bodyDesc = RAPIER.RigidBodyDesc.fixed();
            break;
    }
    
    bodyDesc
        .setTranslation(config.position.x, config.position.y, config.position.z)
        .setLinearDamping(config.linearDamping ?? 0)
        .setAngularDamping(config.angularDamping ?? 0)
        .setGravityScale(config.gravityScale ?? 1)
        .setCanSleep(config.canSleep ?? true)
        .setCcdEnabled(config.ccd ?? false);
    
    if (config.rotation) {
        bodyDesc.setRotation(config.rotation);
    }
    
    const body = world.createRigidBody(bodyDesc);
    
    bodyHandles.set(config.id, body.handle);
    handleToId.set(body.handle, config.id);
}

function removeRigidBody(id: string): void {
    if (!world) return;
    
    const handle = bodyHandles.get(id);
    if (handle === undefined) return;
    
    const body = world.getRigidBody(handle);
    if (body) {
        world.removeRigidBody(body);
    }
    
    handleToId.delete(handle);
    bodyHandles.delete(id);
}

function addCollider(config: ColliderConfig): void {
    if (!world) throw new Error('Physics not initialized');
    
    const bodyHandle = bodyHandles.get(config.bodyId);
    if (bodyHandle === undefined) {
        throw new Error(`Body ${config.bodyId} not found`);
    }
    
    const body = world.getRigidBody(bodyHandle);
    if (!body) throw new Error(`Body ${config.bodyId} not found`);
    
    let colliderDesc: RAPIER.ColliderDesc;
    
    switch (config.shape) {
        case 'box': {
            const size = config.size as Vector3;
            colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
            break;
        }
        
        case 'sphere': {
            const radius = typeof config.size === 'number' ? config.size : (config.size as any).radius;
            colliderDesc = RAPIER.ColliderDesc.ball(radius);
            break;
        }
        
        case 'capsule': {
            const { radius, height } = config.size as { radius: number; height: number };
            colliderDesc = RAPIER.ColliderDesc.capsule(height / 2, radius);
            break;
        }
        
        case 'cylinder': {
            const { radius, height } = config.size as { radius: number; height: number };
            colliderDesc = RAPIER.ColliderDesc.cylinder(height / 2, radius);
            break;
        }
        
        case 'cone': {
            const { radius, height } = config.size as { radius: number; height: number };
            colliderDesc = RAPIER.ColliderDesc.cone(height / 2, radius);
            break;
        }
        
        default:
            throw new Error(`Unsupported shape: ${config.shape}`);
    }
    
    colliderDesc
        .setFriction(config.friction ?? 0.5)
        .setRestitution(config.restitution ?? 0.0)
        .setDensity(config.density ?? 1.0)
        .setSensor(config.isSensor ?? false);
    
    if (config.offset) {
        colliderDesc.setTranslation(config.offset.x, config.offset.y, config.offset.z);
    }
    
    if (config.rotation) {
        colliderDesc.setRotation(config.rotation);
    }
    
    if (config.collisionGroups !== undefined) {
        colliderDesc.setCollisionGroups(config.collisionGroups);
    }
    
    const collider = world.createCollider(colliderDesc, body);
    
    colliderHandles.set(config.id, collider.handle);
    colliderToBody.set(config.id, config.bodyId);
}

function removeCollider(id: string): void {
    if (!world) return;
    
    const handle = colliderHandles.get(id);
    if (handle === undefined) return;
    
    const collider = world.getCollider(handle);
    if (collider) {
        world.removeCollider(collider, true);
    }
    
    colliderHandles.delete(id);
    colliderToBody.delete(id);
}

// ============================================================================
// BODY MANIPULATION
// ============================================================================

function setPosition(id: string, position: Vector3): void {
    if (!world) return;
    
    const handle = bodyHandles.get(id);
    if (handle === undefined) return;
    
    const body = world.getRigidBody(handle);
    if (body) {
        body.setTranslation(position, true);
    }
}

function setRotation(id: string, rotation: Quaternion): void {
    if (!world) return;
    
    const handle = bodyHandles.get(id);
    if (handle === undefined) return;
    
    const body = world.getRigidBody(handle);
    if (body) {
        body.setRotation(rotation, true);
    }
}

function applyForce(id: string, force: Vector3, point?: Vector3): void {
    if (!world) return;
    
    const handle = bodyHandles.get(id);
    if (handle === undefined) return;
    
    const body = world.getRigidBody(handle);
    if (body) {
        if (point) {
            body.addForceAtPoint(force, point, true);
        } else {
            body.addForce(force, true);
        }
    }
}

function applyImpulse(id: string, impulse: Vector3, point?: Vector3): void {
    if (!world) return;
    
    const handle = bodyHandles.get(id);
    if (handle === undefined) return;
    
    const body = world.getRigidBody(handle);
    if (body) {
        if (point) {
            body.applyImpulseAtPoint(impulse, point, true);
        } else {
            body.applyImpulse(impulse, true);
        }
    }
}

function applyTorque(id: string, torque: Vector3): void {
    if (!world) return;
    
    const handle = bodyHandles.get(id);
    if (handle === undefined) return;
    
    const body = world.getRigidBody(handle);
    if (body) {
        body.addTorque(torque, true);
    }
}

function setVelocity(id: string, linear?: Vector3, angular?: Vector3): void {
    if (!world) return;
    
    const handle = bodyHandles.get(id);
    if (handle === undefined) return;
    
    const body = world.getRigidBody(handle);
    if (body) {
        if (linear) body.setLinvel(linear, true);
        if (angular) body.setAngvel(angular, true);
    }
}

// ============================================================================
// QUERIES
// ============================================================================

function raycast(origin: Vector3, direction: Vector3, maxDistance: number, filter?: number): RaycastHit | null {
    if (!world) return null;
    
    const ray = new RAPIER.Ray(origin, direction);
    
    const hit = world.castRay(
        ray,
        maxDistance,
        true, // solid
        filter ? filter : undefined
    );
    
    if (hit) {
        const hitAny = hit as any;
        const colliderHandle = hitAny.collider ?? hitAny.colliderHandle ?? hitAny.handle;
        const collider = colliderHandle !== undefined ? world.getCollider(colliderHandle) : null;
        const parent = collider ? collider.parent() : null;
        const bodyId = parent ? handleToId.get(parent.handle) : undefined;
        
        const toi = hitAny.toi ?? hitAny.timeOfImpact ?? 0;
        const point = ray.pointAt(toi);
        const normal = hitAny.normal ?? { x: 0, y: 1, z: 0 };
        
        return {
            bodyId: bodyId || 'unknown',
            point: { x: point.x, y: point.y, z: point.z },
            normal,
            distance: toi
        };
    }
    
    return null;
}

// ============================================================================
// SIMULATION
// ============================================================================

function step(deltaTime: number): { state: PhysicsState; contacts: ContactEvent[] } {
    if (!world || !eventQueue) {
        return { state: { bodies: new Map() }, contacts: [] };
    }
    
    // Fixed timestep integration
    accumulator += deltaTime;
    
    while (accumulator >= FIXED_TIMESTEP) {
        world.step(eventQueue);
        accumulator -= FIXED_TIMESTEP;
    }
    
    // Collect body states
    const state: PhysicsState = { bodies: new Map() };
    
    for (const [id, handle] of bodyHandles) {
        const body = world.getRigidBody(handle);
        if (!body) continue;
        
        const translation = body.translation();
        const rotation = body.rotation();
        const linvel = body.linvel();
        const angvel = body.angvel();
        
        state.bodies.set(id, {
            position: { x: translation.x, y: translation.y, z: translation.z },
            rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
            linearVelocity: { x: linvel.x, y: linvel.y, z: linvel.z },
            angularVelocity: { x: angvel.x, y: angvel.y, z: angvel.z }
        });
    }
    
    // Collect contact events
    const contacts: ContactEvent[] = [];
    
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
        const collider1 = world!.getCollider(handle1);
        const collider2 = world!.getCollider(handle2);
        
        const parent1 = collider1.parent();
        const parent2 = collider2.parent();
        
        const body1Id = parent1 ? handleToId.get(parent1.handle) : undefined;
        const body2Id = parent2 ? handleToId.get(parent2.handle) : undefined;
        
        if (body1Id && body2Id) {
            contacts.push({
                type: started ? 'start' : 'end',
                body1: body1Id,
                body2: body2Id,
                contacts: [] // Would need contact manifold for detailed contacts
            });
        }
    });
    
    return { state, contacts };
}

function setGravity(gravity: Vector3): void {
    if (world) {
        world.gravity = gravity;
    }
}

function getState(): PhysicsState {
    const state: PhysicsState = { bodies: new Map() };
    
    if (!world) return state;
    
    for (const [id, handle] of bodyHandles) {
        const body = world.getRigidBody(handle);
        if (!body) continue;
        
        const translation = body.translation();
        const rotation = body.rotation();
        const linvel = body.linvel();
        const angvel = body.angvel();
        
        state.bodies.set(id, {
            position: { x: translation.x, y: translation.y, z: translation.z },
            rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
            linearVelocity: { x: linvel.x, y: linvel.y, z: linvel.z },
            angularVelocity: { x: angvel.x, y: angvel.y, z: angvel.z }
        });
    }
    
    return state;
}

function destroy(): void {
    if (world) {
        world.free();
        world = null;
    }
    
    if (eventQueue) {
        eventQueue.free();
        eventQueue = null;
    }
    
    bodyHandles.clear();
    handleToId.clear();
    colliderHandles.clear();
    colliderToBody.clear();
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, id, data } = event.data;
    
    try {
        let result: any;
        
        switch (type) {
            case 'init':
                await initPhysics(data?.gravity);
                result = { initialized: true };
                break;
                
            case 'step':
                result = step(data.deltaTime);
                // Convert Map to object for transfer
                result.state.bodies = Object.fromEntries(result.state.bodies);
                break;
                
            case 'addBody':
                addRigidBody(data);
                result = { added: true };
                break;
                
            case 'removeBody':
                removeRigidBody(data.id);
                result = { removed: true };
                break;
                
            case 'addCollider':
                addCollider(data);
                result = { added: true };
                break;
                
            case 'removeCollider':
                removeCollider(data.id);
                result = { removed: true };
                break;
                
            case 'setPosition':
                setPosition(data.id, data.position);
                result = { updated: true };
                break;
                
            case 'setRotation':
                setRotation(data.id, data.rotation);
                result = { updated: true };
                break;
                
            case 'applyForce':
                applyForce(data.id, data.force, data.point);
                result = { applied: true };
                break;
                
            case 'applyImpulse':
                applyImpulse(data.id, data.impulse, data.point);
                result = { applied: true };
                break;
                
            case 'applyTorque':
                applyTorque(data.id, data.torque);
                result = { applied: true };
                break;
                
            case 'setVelocity':
                setVelocity(data.id, data.linear, data.angular);
                result = { updated: true };
                break;
                
            case 'raycast':
                result = raycast(data.origin, data.direction, data.maxDistance, data.filter);
                break;
                
            case 'setGravity':
                setGravity(data.gravity);
                result = { updated: true };
                break;
                
            case 'getState':
                const state = getState();
                result = { bodies: Object.fromEntries(state.bodies) };
                break;
                
            case 'destroy':
                destroy();
                result = { destroyed: true };
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
        
        self.postMessage({ type, id, success: true, data: result } as WorkerResponse);
        
    } catch (error: any) {
        self.postMessage({
            type,
            id,
            success: false,
            error: error.message
        } as WorkerResponse);
    }
};

// Signal ready
self.postMessage({ type: 'ready', id: 'init', success: true });

export {};
