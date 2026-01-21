/**
 * AETHEL ENGINE - PHYSICS WEB WORKER (RAPIER)
 * ============================================
 * 
 * Web Worker dedicado para simulação física usando Rapier3D.
 * Move todo o cálculo de física para uma thread separada,
 * evitando bloqueio do main thread e stuttering.
 * 
 * Comunicação via MessagePort com o main thread.
 * 
 * Features:
 * - Simulação física em thread separada
 * - Buffer compartilhado para transforms (SharedArrayBuffer)
 * - Collision detection assíncrono
 * - Raycasting paralelo
 * - Interpolação de estados
 */

// Import Rapier (will be loaded dynamically in the worker)
let RAPIER: any = null;
let world: any = null;
let bodies = new Map<number, any>();
let colliders = new Map<number, any>();
let joints = new Map<number, any>();
let previousTransforms = new Map<number, { pos: { x: number; y: number; z: number }; rot: { x: number; y: number; z: number; w: number } }>();

// Shared buffers for transform data
let transformBuffer: Float32Array | null = null;
let transformSharedBuffer: SharedArrayBuffer | null = null;

// Configuration
let config = {
    gravity: { x: 0, y: -9.81, z: 0 },
    timestep: 1 / 60,
    maxVelocityIterations: 4,
    maxPositionIterations: 2,
    interpolation: true
};

// State
let isInitialized = false;
let isPaused = false;
let lastTime = 0;
let accumulator = 0;

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

self.onmessage = async (event: MessageEvent) => {
    const { type, payload, id } = event.data;
    
    try {
        let result: any;
        
        switch (type) {
            case 'init':
                result = await handleInit(payload);
                break;
            case 'step':
                result = handleStep(payload);
                break;
            case 'createBody':
                result = handleCreateBody(payload);
                break;
            case 'removeBody':
                result = handleRemoveBody(payload);
                break;
            case 'createCollider':
                result = handleCreateCollider(payload);
                break;
            case 'removeCollider':
                result = handleRemoveCollider(payload);
                break;
            case 'createJoint':
                result = handleCreateJoint(payload);
                break;
            case 'removeJoint':
                result = handleRemoveJoint(payload);
                break;
            case 'applyForce':
                result = handleApplyForce(payload);
                break;
            case 'applyImpulse':
                result = handleApplyImpulse(payload);
                break;
            case 'setVelocity':
                result = handleSetVelocity(payload);
                break;
            case 'setPosition':
                result = handleSetPosition(payload);
                break;
            case 'setRotation':
                result = handleSetRotation(payload);
                break;
            case 'raycast':
                result = handleRaycast(payload);
                break;
            case 'queryPoint':
                result = handleQueryPoint(payload);
                break;
            case 'queryAABB':
                result = handleQueryAABB(payload);
                break;
            case 'pause':
                isPaused = true;
                result = { paused: true };
                break;
            case 'resume':
                isPaused = false;
                result = { paused: false };
                break;
            case 'setConfig':
                result = handleSetConfig(payload);
                break;
            case 'getState':
                result = handleGetState();
                break;
            case 'reset':
                result = handleReset();
                break;
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
        
        postMessage({ type: 'response', id, success: true, result });
        
    } catch (error) {
        postMessage({ 
            type: 'response', 
            id, 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

async function handleInit(payload: any): Promise<any> {
    if (isInitialized) {
        return { already: true };
    }
    
    // Load Rapier
    try {
        // Dynamic import for Rapier - tries local first, then optional URL, then CDN
        if (typeof importScripts === 'function') {
            const candidates = [];
            if (payload?.rapierUrl) {
                candidates.push(payload.rapierUrl);
            }
            candidates.push('/workers/rapier3d.min.js');
            candidates.push('/rapier3d.min.js');
            candidates.push('https://cdn.jsdelivr.net/npm/@dimforge/rapier3d@0.12.0/rapier.min.js');

            let loaded = false;
            for (const candidate of candidates) {
                try {
                    importScripts(candidate);
                    RAPIER = (self as any).RAPIER;
                    if (RAPIER) {
                        (self as any).__rapierSource = candidate;
                        loaded = true;
                        break;
                    }
                } catch {
                    // try next candidate
                }
            }

            if (!loaded) {
                throw new Error('Rapier not loaded');
            }
        }

        if (!RAPIER) {
            throw new Error('Rapier not loaded');
        }

        await RAPIER.init();

    } catch (e) {
        throw e;
    }
    
    // Apply config
    if (payload.config) {
        config = { ...config, ...payload.config };
    }
    
    // Create world
    world = new RAPIER.World(
        new RAPIER.Vector3(config.gravity.x, config.gravity.y, config.gravity.z)
    );
    
    // Setup shared buffer if provided
    if (payload.sharedBuffer) {
        transformSharedBuffer = payload.sharedBuffer;
        transformBuffer = new Float32Array(transformSharedBuffer);
    } else {
        // Create our own buffer for up to 1000 bodies (each needs 7 floats: pos xyz + quat xyzw)
        const maxBodies = payload.maxBodies || 1000;
        transformSharedBuffer = new SharedArrayBuffer(maxBodies * 7 * 4);
        transformBuffer = new Float32Array(transformSharedBuffer);
    }
    
    isInitialized = true;
    lastTime = performance.now();
    
    return { 
        initialized: true,
        sharedBuffer: transformSharedBuffer,
        rapierVersion: RAPIER.version ? RAPIER.version() : 'mock',
        rapierSource: (self as any).__rapierSource || 'unknown'
    };
}

// ============================================================================
// SIMULATION STEP
// ============================================================================

function handleStep(payload: any): any {
    if (!isInitialized || !world || isPaused) {
        return { stepped: false };
    }
    
    const now = payload.time || performance.now();
    let deltaTime = payload.deltaTime || (now - lastTime) / 1000;
    lastTime = now;
    
    // Clamp delta time to prevent spiral of death
    deltaTime = Math.min(deltaTime, 0.1);
    
    if (config.interpolation) {
        // Fixed timestep with interpolation
        accumulator += deltaTime;
        
        let steps = 0;
        while (accumulator >= config.timestep && steps < 5) {
            world.step();
            accumulator -= config.timestep;
            steps++;
        }
        
        // Calculate interpolation factor
        const alpha = accumulator / config.timestep;
        
        // Update transform buffer with interpolated values
        updateTransformBuffer(alpha);
        
    } else {
        // Variable timestep
        world.timestep = deltaTime;
        world.step();
        updateTransformBuffer(1);
    }
    
    // Check for collisions
    const collisions = getCollisionEvents();
    
    return {
        stepped: true,
        deltaTime,
        bodyCount: bodies.size,
        collisions
    };
}

function updateTransformBuffer(alpha: number): void {
    if (!transformBuffer || !world) return;
    
    let index = 0;
    
    for (const [bodyId, body] of bodies) {
        if (index * 7 >= transformBuffer.length) break;
        
        const pos = body.translation();
        const rot = body.rotation();
        
        const prev = previousTransforms.get(bodyId) || { pos, rot };
        const interpPos = {
            x: lerp(prev.pos.x, pos.x, alpha),
            y: lerp(prev.pos.y, pos.y, alpha),
            z: lerp(prev.pos.z, pos.z, alpha)
        };
        const interpRot = slerp(prev.rot, rot, alpha);
        
        const baseIndex = index * 7;
        transformBuffer[baseIndex] = interpPos.x;
        transformBuffer[baseIndex + 1] = interpPos.y;
        transformBuffer[baseIndex + 2] = interpPos.z;
        transformBuffer[baseIndex + 3] = interpRot.x;
        transformBuffer[baseIndex + 4] = interpRot.y;
        transformBuffer[baseIndex + 5] = interpRot.z;
        transformBuffer[baseIndex + 6] = interpRot.w;

        previousTransforms.set(bodyId, { pos, rot });
        
        index++;
    }
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function slerp(a: { x: number; y: number; z: number; w: number }, b: { x: number; y: number; z: number; w: number }, t: number) {
    let cosHalfTheta = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;

    if (cosHalfTheta < 0) {
        b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
        cosHalfTheta = -cosHalfTheta;
    }

    if (cosHalfTheta >= 1.0) {
        return { x: a.x, y: a.y, z: a.z, w: a.w };
    }

    const halfTheta = Math.acos(Math.min(1, Math.max(-1, cosHalfTheta)));
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
        return {
            x: lerp(a.x, b.x, t),
            y: lerp(a.y, b.y, t),
            z: lerp(a.z, b.z, t),
            w: lerp(a.w, b.w, t)
        };
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return {
        x: a.x * ratioA + b.x * ratioB,
        y: a.y * ratioA + b.y * ratioB,
        z: a.z * ratioA + b.z * ratioB,
        w: a.w * ratioA + b.w * ratioB
    };
}

function getCollisionEvents(): any[] {
    if (!world) return [];
    
    const events: any[] = [];
    
    world.contactPairsWith(null, (collider1: any, collider2: any, started: boolean) => {
        events.push({
            type: started ? 'start' : 'end',
            collider1: collider1.handle,
            collider2: collider2.handle
        });
    });
    
    return events;
}

// ============================================================================
// BODY MANAGEMENT
// ============================================================================

function handleCreateBody(payload: any): any {
    if (!world || !RAPIER) {
        throw new Error('Physics not initialized');
    }
    
    const { id, type, position, rotation, mass, linearDamping, angularDamping, gravityScale } = payload;
    
    // Create body description
    let bodyDesc;
    switch (type) {
        case 'dynamic':
            bodyDesc = RAPIER.RigidBodyDesc.dynamic();
            break;
        case 'kinematic':
            bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
            break;
        case 'static':
        default:
            bodyDesc = RAPIER.RigidBodyDesc.fixed();
    }
    
    // Set position
    if (position) {
        bodyDesc.setTranslation(position.x, position.y, position.z);
    }
    
    // Set rotation
    if (rotation) {
        bodyDesc.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
    }
    
    // Set properties
    if (linearDamping !== undefined) {
        bodyDesc.setLinearDamping(linearDamping);
    }
    if (angularDamping !== undefined) {
        bodyDesc.setAngularDamping(angularDamping);
    }
    if (gravityScale !== undefined) {
        bodyDesc.setGravityScale(gravityScale);
    }
    
    // Create body
    const body = world.createRigidBody(bodyDesc);
    bodies.set(id, body);
    
    return { 
        id, 
        handle: body.handle,
        created: true 
    };
}

function handleRemoveBody(payload: any): any {
    const { id } = payload;
    const body = bodies.get(id);
    
    if (body && world) {
        world.removeRigidBody(body);
        bodies.delete(id);
        previousTransforms.delete(id);
        return { removed: true };
    }
    
    return { removed: false };
}

// ============================================================================
// COLLIDER MANAGEMENT
// ============================================================================

function handleCreateCollider(payload: any): any {
    if (!world || !RAPIER) {
        throw new Error('Physics not initialized');
    }
    
    const { id, bodyId, shape, size, offset, rotation, friction, restitution, density, sensor } = payload;
    
    const body = bodies.get(bodyId);
    if (!body) {
        throw new Error(`Body ${bodyId} not found`);
    }
    
    // Create collider description based on shape
    let colliderDesc;
    switch (shape) {
        case 'box':
            colliderDesc = RAPIER.ColliderDesc.cuboid(
                size.x / 2, 
                size.y / 2, 
                size.z / 2
            );
            break;
        case 'sphere':
            colliderDesc = RAPIER.ColliderDesc.ball(size.radius || size.x);
            break;
        case 'capsule':
            colliderDesc = RAPIER.ColliderDesc.capsule(size.height / 2, size.radius);
            break;
        case 'cylinder':
            colliderDesc = RAPIER.ColliderDesc.cylinder(size.height / 2, size.radius);
            break;
        case 'cone':
            colliderDesc = RAPIER.ColliderDesc.cone(size.height / 2, size.radius);
            break;
        case 'mesh':
            // For mesh colliders, need vertices and indices
            if (payload.vertices && payload.indices) {
                colliderDesc = RAPIER.ColliderDesc.trimesh(
                    new Float32Array(payload.vertices),
                    new Uint32Array(payload.indices)
                );
            } else {
                throw new Error('Mesh collider requires vertices and indices');
            }
            break;
        case 'convex':
            if (payload.vertices) {
                colliderDesc = RAPIER.ColliderDesc.convexHull(
                    new Float32Array(payload.vertices)
                );
            } else {
                throw new Error('Convex collider requires vertices');
            }
            break;
        default:
            colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    }
    
    // Set offset
    if (offset) {
        colliderDesc.setTranslation(offset.x, offset.y, offset.z);
    }
    
    // Set rotation
    if (rotation) {
        colliderDesc.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
    }
    
    // Set properties
    if (friction !== undefined) {
        colliderDesc.setFriction(friction);
    }
    if (restitution !== undefined) {
        colliderDesc.setRestitution(restitution);
    }
    if (density !== undefined) {
        colliderDesc.setDensity(density);
    }
    if (sensor) {
        colliderDesc.setSensor(true);
    }
    
    // Create collider
    const collider = world.createCollider(colliderDesc, body);
    colliders.set(id, collider);
    
    return { 
        id, 
        handle: collider.handle,
        created: true 
    };
}

function handleRemoveCollider(payload: any): any {
    const { id } = payload;
    const collider = colliders.get(id);
    
    if (collider && world) {
        world.removeCollider(collider);
        colliders.delete(id);
        return { removed: true };
    }
    
    return { removed: false };
}

// ============================================================================
// JOINT MANAGEMENT
// ============================================================================

function handleCreateJoint(payload: any): any {
    if (!world || !RAPIER) {
        throw new Error('Physics not initialized');
    }
    
    const { id, type, body1Id, body2Id, anchor1, anchor2, axis, limits } = payload;
    
    const body1 = bodies.get(body1Id);
    const body2 = bodies.get(body2Id);
    
    if (!body1 || !body2) {
        throw new Error('One or both bodies not found');
    }
    
    let jointData;
    
    switch (type) {
        case 'fixed':
            jointData = RAPIER.JointData.fixed(
                { x: anchor1?.x || 0, y: anchor1?.y || 0, z: anchor1?.z || 0 },
                { x: 0, y: 0, z: 0, w: 1 },
                { x: anchor2?.x || 0, y: anchor2?.y || 0, z: anchor2?.z || 0 },
                { x: 0, y: 0, z: 0, w: 1 }
            );
            break;
        case 'spherical':
            jointData = RAPIER.JointData.spherical(
                { x: anchor1?.x || 0, y: anchor1?.y || 0, z: anchor1?.z || 0 },
                { x: anchor2?.x || 0, y: anchor2?.y || 0, z: anchor2?.z || 0 }
            );
            break;
        case 'revolute':
            jointData = RAPIER.JointData.revolute(
                { x: anchor1?.x || 0, y: anchor1?.y || 0, z: anchor1?.z || 0 },
                { x: anchor2?.x || 0, y: anchor2?.y || 0, z: anchor2?.z || 0 },
                { x: axis?.x || 0, y: axis?.y || 1, z: axis?.z || 0 }
            );
            if (limits) {
                jointData.limitsEnabled = true;
                jointData.limits = [limits.min || -Math.PI, limits.max || Math.PI];
            }
            break;
        case 'prismatic':
            jointData = RAPIER.JointData.prismatic(
                { x: anchor1?.x || 0, y: anchor1?.y || 0, z: anchor1?.z || 0 },
                { x: anchor2?.x || 0, y: anchor2?.y || 0, z: anchor2?.z || 0 },
                { x: axis?.x || 0, y: axis?.y || 1, z: axis?.z || 0 }
            );
            if (limits) {
                jointData.limitsEnabled = true;
                jointData.limits = [limits.min || -1, limits.max || 1];
            }
            break;
        default:
            throw new Error(`Unknown joint type: ${type}`);
    }
    
    const joint = world.createImpulseJoint(jointData, body1, body2);
    joints.set(id, joint);
    
    return { 
        id, 
        handle: joint.handle,
        created: true 
    };
}

function handleRemoveJoint(payload: any): any {
    const { id } = payload;
    const joint = joints.get(id);
    
    if (joint && world) {
        world.removeImpulseJoint(joint);
        joints.delete(id);
        return { removed: true };
    }
    
    return { removed: false };
}

// ============================================================================
// FORCES AND VELOCITIES
// ============================================================================

function handleApplyForce(payload: any): any {
    const { bodyId, force, point } = payload;
    const body = bodies.get(bodyId);
    
    if (!body) {
        throw new Error(`Body ${bodyId} not found`);
    }
    
    if (point) {
        body.addForceAtPoint(
            { x: force.x, y: force.y, z: force.z },
            { x: point.x, y: point.y, z: point.z },
            true
        );
    } else {
        body.addForce({ x: force.x, y: force.y, z: force.z }, true);
    }
    
    return { applied: true };
}

function handleApplyImpulse(payload: any): any {
    const { bodyId, impulse, point } = payload;
    const body = bodies.get(bodyId);
    
    if (!body) {
        throw new Error(`Body ${bodyId} not found`);
    }
    
    if (point) {
        body.applyImpulseAtPoint(
            { x: impulse.x, y: impulse.y, z: impulse.z },
            { x: point.x, y: point.y, z: point.z },
            true
        );
    } else {
        body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    }
    
    return { applied: true };
}

function handleSetVelocity(payload: any): any {
    const { bodyId, linear, angular } = payload;
    const body = bodies.get(bodyId);
    
    if (!body) {
        throw new Error(`Body ${bodyId} not found`);
    }
    
    if (linear) {
        body.setLinvel({ x: linear.x, y: linear.y, z: linear.z }, true);
    }
    if (angular) {
        body.setAngvel({ x: angular.x, y: angular.y, z: angular.z }, true);
    }
    
    return { set: true };
}

function handleSetPosition(payload: any): any {
    const { bodyId, position } = payload;
    const body = bodies.get(bodyId);
    
    if (!body) {
        throw new Error(`Body ${bodyId} not found`);
    }
    
    body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    
    return { set: true };
}

function handleSetRotation(payload: any): any {
    const { bodyId, rotation } = payload;
    const body = bodies.get(bodyId);
    
    if (!body) {
        throw new Error(`Body ${bodyId} not found`);
    }
    
    body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }, true);
    
    return { set: true };
}

// ============================================================================
// QUERIES
// ============================================================================

function handleRaycast(payload: any): any {
    if (!world) {
        throw new Error('Physics not initialized');
    }
    
    const { origin, direction, maxDistance, solid } = payload;
    
    const ray = new RAPIER.Ray(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: direction.x, y: direction.y, z: direction.z }
    );
    
    const hit = world.castRay(ray, maxDistance || 1000, solid !== false);
    
    if (hit) {
        const hitPoint = ray.pointAt(hit.toi);
        return {
            hit: true,
            distance: hit.toi,
            point: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
            normal: hit.normal ? { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z } : null,
            colliderHandle: hit.collider ? hit.collider.handle : null
        };
    }
    
    return { hit: false };
}

function handleQueryPoint(payload: any): any {
    if (!world) {
        throw new Error('Physics not initialized');
    }
    
    const { point } = payload;
    const results: any[] = [];
    
    world.intersectionsWithPoint(
        { x: point.x, y: point.y, z: point.z },
        (collider: any) => {
            results.push({
                colliderHandle: collider.handle
            });
            return true; // Continue searching
        }
    );
    
    return { results };
}

function handleQueryAABB(payload: any): any {
    if (!world) {
        throw new Error('Physics not initialized');
    }
    
    const { min, max } = payload;
    const results: any[] = [];
    
    world.collidersIntersectingAabb(
        { x: min.x, y: min.y, z: min.z },
        { x: max.x, y: max.y, z: max.z },
        (collider: any) => {
            results.push({
                colliderHandle: collider.handle
            });
            return true;
        }
    );
    
    return { results };
}

// ============================================================================
// CONFIGURATION AND STATE
// ============================================================================

function handleSetConfig(payload: any): any {
    config = { ...config, ...payload };
    
    if (world && payload.gravity) {
        world.gravity = { x: config.gravity.x, y: config.gravity.y, z: config.gravity.z };
    }
    
    return { config };
}

function handleGetState(): any {
    return {
        initialized: isInitialized,
        paused: isPaused,
        bodyCount: bodies.size,
        colliderCount: colliders.size,
        jointCount: joints.size,
        config
    };
}

function handleReset(): any {
    // Remove all joints, colliders, and bodies
    for (const joint of joints.values()) {
        try { world?.removeImpulseJoint(joint); } catch {}
    }
    for (const collider of colliders.values()) {
        try { world?.removeCollider(collider); } catch {}
    }
    for (const body of bodies.values()) {
        try { world?.removeRigidBody(body); } catch {}
    }
    
    joints.clear();
    colliders.clear();
    bodies.clear();
    previousTransforms.clear();
    
    accumulator = 0;
    
    return { reset: true };
}

// Notify that worker is ready
postMessage({ type: 'ready' });
