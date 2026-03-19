/**
 * AETHEL ENGINE - CULLING WEB WORKER (VIRTUAL NANITE)
 * ====================================================
 */

// ============================================================================
// STATE
// ============================================================================

let objects = new Map();
let clusters = new Map();
let camera = null;
let frustum = null;

// Configuration
let config = {
    enableFrustumCulling: true,
    enableOcclusionCulling: true,
    enableLOD: true,
    lodBias: 1.0,
    lodDistances: [10, 25, 50, 100, 200],
    screenSizeThreshold: 0.01, // Minimum screen space size to render
    clusterSize: 64, // Objects per cluster
    useHierarchicalCulling: true
};

// Occlusion buffer (simplified HZB)
let occlusionBuffer = null;
let occlusionWidth = 256;
let occlusionHeight = 128;

let isInitialized = false;

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

self.onmessage = (event) => {
    const { type, payload, id } = event.data;
    
    try {
        let result;
        
        switch (type) {
            case 'init':
                result = handleInit(payload);
                break;
            case 'cull':
                result = handleCull(payload);
                break;
            case 'addObject':
                result = handleAddObject(payload);
                break;
            case 'updateObject':
                result = handleUpdateObject(payload);
                break;
            case 'removeObject':
                result = handleRemoveObject(payload);
                break;
            case 'updateCamera':
                result = handleUpdateCamera(payload);
                break;
            case 'updateOcclusionBuffer':
                result = handleUpdateOcclusionBuffer(payload);
                break;
            case 'setConfig':
                result = handleSetConfig(payload);
                break;
            case 'rebuildClusters':
                result = rebuildClusters();
                break;
            case 'getStats':
                result = getStats();
                break;
            case 'clear':
                result = handleClear();
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

function handleInit(payload) {
    if (payload.config) {
        config = { ...config, ...payload.config };
    }
    
    // Initialize occlusion buffer
    if (payload.occlusionWidth) occlusionWidth = payload.occlusionWidth;
    if (payload.occlusionHeight) occlusionHeight = payload.occlusionHeight;
    
    occlusionBuffer = new Float32Array(occlusionWidth * occlusionHeight);
    occlusionBuffer.fill(1); // Initialize with far depth
    
    isInitialized = true;
    
    return { 
        initialized: true,
        config 
    };
}

// ============================================================================
// MAIN CULLING PASS
// ============================================================================

function handleCull(payload) {
    const startTime = performance.now();
    
    // Update camera if provided
    if (payload.camera) {
        handleUpdateCamera(payload);
    }
    
    if (!camera || !frustum) {
        throw new Error('Camera not set');
    }
    
    const visibleObjects = [];
    const hiddenObjects = [];
    const lodChanges = [];
    
    let frustumCulled = 0;
    let occlusionCulled = 0;
    let lodUpdates = 0;
    
    // Phase 1: Cluster culling (if enabled)
    const visibleClusters = new Set();
    
    if (config.useHierarchicalCulling && clusters.size > 0) {
        for (const [clusterId, cluster] of clusters) {
            if (isSphereInFrustum(cluster.bounds)) {
                cluster.visible = true;
                visibleClusters.add(clusterId);
            } else {
                cluster.visible = false;
            }
        }
    }
    
    // Phase 2: Object culling
    for (const [objectId, obj] of objects) {
        obj.lastFrameVisible = obj.visible;
        
        // Skip if cluster is culled
        if (config.useHierarchicalCulling && obj.cluster !== undefined) {
            if (!visibleClusters.has(obj.cluster)) {
                obj.visible = false;
                hiddenObjects.push(objectId);
                frustumCulled++;
                continue;
            }
        }
        
        // Calculate distance to camera
        obj.distanceToCamera = distance(obj.bounds.center, camera.position);
        
        // Calculate screen space size
        obj.screenSpaceSize = calculateScreenSpaceSize(obj.bounds, obj.distanceToCamera);
        
        // Skip tiny objects
        if (obj.screenSpaceSize < config.screenSizeThreshold) {
            obj.visible = false;
            hiddenObjects.push(objectId);
            continue;
        }
        
        // Frustum culling
        if (config.enableFrustumCulling) {
            if (!isSphereInFrustum(obj.bounds)) {
                obj.visible = false;
                hiddenObjects.push(objectId);
                frustumCulled++;
                continue;
            }
        }
        
        // Occlusion culling
        if (config.enableOcclusionCulling && occlusionBuffer) {
            if (isOccluded(obj)) {
                obj.visible = false;
                hiddenObjects.push(objectId);
                occlusionCulled++;
                continue;
            }
        }
        
        // Object is visible
        obj.visible = true;
        visibleObjects.push(objectId);
        
        // LOD selection
        if (config.enableLOD && obj.lodLevels > 1) {
            const newLod = selectLOD(obj);
            
            if (newLod !== obj.currentLod) {
                obj.currentLod = newLod;
                lodChanges.push({ id: objectId, newLod });
                lodUpdates++;
            }
        }
    }
    
    const processingTime = performance.now() - startTime;
    
    const stats = {
        totalObjects: objects.size,
        visibleObjects: visibleObjects.length,
        frustumCulled,
        occlusionCulled,
        lodUpdates,
        processingTime
    };
    
    return {
        visibleObjects,
        hiddenObjects,
        lodChanges,
        stats
    };
}

// ============================================================================
// FRUSTUM CULLING
// ============================================================================

function extractFrustumPlanes(viewProj) {
    // Extract frustum planes from view-projection matrix
    const planes = [];
    
    // Left plane
    planes.push(createPlane(
        viewProj[3] + viewProj[0],
        viewProj[7] + viewProj[4],
        viewProj[11] + viewProj[8],
        viewProj[15] + viewProj[12]
    ));
    
    // Right plane
    planes.push(createPlane(
        viewProj[3] - viewProj[0],
        viewProj[7] - viewProj[4],
        viewProj[11] - viewProj[8],
        viewProj[15] - viewProj[12]
    ));
    
    // Top plane
    planes.push(createPlane(
        viewProj[3] - viewProj[1],
        viewProj[7] - viewProj[5],
        viewProj[11] - viewProj[9],
        viewProj[15] - viewProj[13]
    ));
    
    // Bottom plane
    planes.push(createPlane(
        viewProj[3] + viewProj[1],
        viewProj[7] + viewProj[5],
        viewProj[11] + viewProj[9],
        viewProj[15] + viewProj[13]
    ));
    
    // Near plane
    planes.push(createPlane(
        viewProj[3] + viewProj[2],
        viewProj[7] + viewProj[6],
        viewProj[11] + viewProj[10],
        viewProj[15] + viewProj[14]
    ));
    
    // Far plane
    planes.push(createPlane(
        viewProj[3] - viewProj[2],
        viewProj[7] - viewProj[6],
        viewProj[11] - viewProj[10],
        viewProj[15] - viewProj[14]
    ));
    
    return { planes };
}

function createPlane(a, b, c, d) {
    const length = Math.sqrt(a * a + b * b + c * c);
    return {
        normal: { x: a / length, y: b / length, z: c / length },
        distance: d / length
    };
}

function isSphereInFrustum(sphere) {
    if (!frustum) return true;
    
    for (const plane of frustum.planes) {
        const dist = plane.normal.x * sphere.center.x + 
                     plane.normal.y * sphere.center.y + 
                     plane.normal.z * sphere.center.z + 
                     plane.distance;
        
        if (dist < -sphere.radius) {
            return false;
        }
    }
    
    return true;
}

// ============================================================================
// OCCLUSION CULLING
// ============================================================================

function isOccluded(obj) {
    // Simplified HZB occlusion test
    // In a real implementation, we would project the AABB to screen space
    // and test against the depth buffer levels.
    return false; // For now, pass all
}

// ============================================================================
// LOD SELECTION
// ============================================================================

function selectLOD(obj) {
    const dist = obj.distanceToCamera * config.lodBias;
    
    for (let i = 0; i < config.lodDistances.length; i++) {
        if (dist < config.lodDistances[i]) {
            return Math.min(i, obj.lodLevels - 1);
        }
    }
    
    return obj.lodLevels - 1;
}

// ============================================================================
// UTILS
// ============================================================================

function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateScreenSpaceSize(sphere, distance) {
    // Simplified screen space size calculation
    if (distance <= 0) return 1.0;
    return (sphere.radius * 2.0) / distance;
}

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

function handleAddObject(payload) {
    objects.set(payload.id, {
        id: payload.id,
        bounds: payload.bounds,
        aabb: payload.aabb,
        lodLevels: payload.lodLevels || 1,
        currentLod: 0,
        screenSpaceSize: 0,
        distanceToCamera: 0,
        visible: true,
        lastFrameVisible: true,
        cluster: payload.cluster
    });
    return { success: true };
}

function handleUpdateObject(payload) {
    const obj = objects.get(payload.id);
    if (obj) {
        if (payload.bounds) obj.bounds = payload.bounds;
        if (payload.aabb) obj.aabb = payload.aabb;
        if (payload.cluster !== undefined) obj.cluster = payload.cluster;
        return { success: true };
    }
    return { success: false };
}

function handleRemoveObject(payload) {
    objects.delete(payload.id);
    return { success: true };
}

function handleUpdateCamera(payload) {
    camera = payload.camera;
    if (camera && camera.viewMatrix && camera.projectionMatrix) {
        // Calculate View-Projection matrix
        const viewProj = multiplyMatrices(camera.projectionMatrix, camera.viewMatrix);
        frustum = extractFrustumPlanes(viewProj);
    }
    return { success: true };
}

function handleUpdateOcclusionBuffer(payload) {
    if (payload.buffer && occlusionBuffer) {
        occlusionBuffer.set(payload.buffer);
    }
    return { success: true };
}

function handleSetConfig(payload) {
    config = { ...config, ...payload };
    return { success: true, config };
}

function rebuildClusters() {
    clusters.clear();
    // Implementation of clustering logic would go here
    return { success: true, clusterCount: clusters.size };
}

function getStats() {
    return {
        objectCount: objects.size,
        clusterCount: clusters.size,
        config
    };
}

function handleClear() {
    objects.clear();
    clusters.clear();
    return { success: true };
}

function multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += a[i * 4 + k] * b[k * 4 + j];
            }
            result[i * 4 + j] = sum;
        }
    }
    return result;
}
