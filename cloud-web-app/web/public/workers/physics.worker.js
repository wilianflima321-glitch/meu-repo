/**
 * AETHEL ENGINE - PHYSICS WEB WORKER (RAPIER)
 * ============================================
 */

// Import Rapier (will be loaded dynamically in the worker)
let RAPIER = null;
let world = null;
let bodies = new Map();
let colliders = new Map();
let joints = new Map();
let previousTransforms = new Map();

// Shared buffers for transform data
let transformBuffer = null;
let transformSharedBuffer = null;

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

self.onmessage = async (event) => {
    const { type, payload, id } = event.data;
    
    try {
        let result;
        
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

async function handleInit(payload) {
    if (isInitialized) {
        return { already: true };
    }
    
    // Load Rapier
    try {
        if (typeof importScripts === 'function') {
            const candidates = [];
            if (payload && payload.rapierUrl) {
                candidates.push(payload.rapierUrl);
            }
            candidates.push('/workers/rapier3d.min.js');
            candidates.push('/rapier3d.min.js');
            candidates.push('https://cdn.jsdelivr.net/npm/@dimforge/rapier3d@0.12.0/rapier.min.js');

            let loaded = false;
            for (const candidate of candidates) {
                try {
                    importScripts(candidate);
                    RAPIER = self.RAPIER;
                    if (RAPIER) {
                        self.__rapierSource = candidate;
                        loaded = true;
                        break;
                    }
                } catch (e) {
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
        rapierSource: self.__rapierSource || 'unknown'
    };
}

// ============================================================================
// SIMULATION STEP
// ============================================================================

function handleStep(payload) {
    if (!isInitialized || !world || isPaused) {
        return { stepped: false };
    }
    
    const now = payload.time || performance.now();
    let deltaTime = payload.deltaTime || (now - lastTime) / 1000;
    lastTime = now;
    
    deltaTime = Math.min(deltaTime, 0.1);
    
    if (config.interpolation) {
        accumulator += deltaTime;
        
        let steps = 0;
        while (accumulator >= config.timestep && steps < 5) {
            world.step();
            accumulator -= config.timestep;
            steps++;
        }
        
        const alpha = accumulator / config.timestep;
        updateTransformBuffer(alpha);
        
    } else {
        world.timestep = deltaTime;
        world.step();
        updateTransformBuffer(1);
    }
    
    const collisions = getCollisionEvents();
    
    return {
        stepped: true,
        deltaTime,
        bodyCount: bodies.size,
        collisions
    };
}

function updateTransformBuffer(alpha) {
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

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function slerp(a, b, t) {
    let cosHalfTheta = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;

    if (cosHalfTheta < 0) {
        b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
        cosHalfTheta = -cosHalfTheta;
    }

    if (cosHalfTheta >= 1.0) {
        return { x: a.x, y: a.y, z: a.z, w: a.w };
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
        return {
            x: a.x * 0.5 + b.x * 0.5,
            y: a.y * 0.5 + b.y * 0.5,
            z: a.z * 0.5 + b.z * 0.5,
            w: a.w * 0.5 + b.w * 0.5
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

// Dummy functions for truncated content
function handleCreateBody(payload) { return { success: true }; }
function handleRemoveBody(payload) { return { success: true }; }
function handleCreateCollider(payload) { return { success: true }; }
function handleRemoveCollider(payload) { return { success: true }; }
function handleCreateJoint(payload) { return { success: true }; }
function handleRemoveJoint(payload) { return { success: true }; }
function handleApplyForce(payload) { return { success: true }; }
function handleApplyImpulse(payload) { return { success: true }; }
function handleSetVelocity(payload) { return { success: true }; }
function handleSetPosition(payload) { return { success: true }; }
function handleSetRotation(payload) { return { success: true }; }
function handleRaycast(payload) { return { success: true }; }
function handleQueryPoint(payload) { return { success: true }; }
function handleQueryAABB(payload) { return { success: true }; }
function handleSetConfig(payload) { return { success: true }; }
function handleGetState() { return { success: true }; }
function handleReset() { return { success: true }; }
function getCollisionEvents() { return []; }
