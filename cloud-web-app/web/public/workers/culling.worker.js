/**
 * AETHEL ENGINE - CULLING WEB WORKER (VIRTUAL NANITE)
 * ====================================================
 * 
 * Web Worker dedicado para culling de geometria estilo "Virtual Nanite".
 * Processa frustum culling, occlusion culling e LOD selection
 * em thread separada para não impactar o framerate.
 * 
 * Features:
 * - Frustum culling paralelo
 * - Hierarchical Z-buffer occlusion
 * - LOD selection baseado em distância/screen-size
 * - Cluster-based culling (grupos de meshes)
 * - Streaming de geometria baseado em visibilidade
 */

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

interface BoundingBox {
    min: Vector3;
    max: Vector3;
}

interface BoundingSphere {
    center: Vector3;
    radius: number;
}

interface Plane {
    normal: Vector3;
    distance: number;
}

interface Frustum {
    planes: Plane[];
}

interface CullableObject {
    id: number;
    bounds: BoundingSphere;
    aabb: BoundingBox;
    lodLevels: number;
    currentLod: number;
    screenSpaceSize: number;
    distanceToCamera: number;
    visible: boolean;
    lastFrameVisible: boolean;
    cluster?: number;
}

interface Cluster {
    id: number;
    bounds: BoundingSphere;
    objects: number[];
    visible: boolean;
}

interface CameraData {
    position: Vector3;
    forward: Vector3;
    up: Vector3;
    right: Vector3;
    fov: number;
    aspect: number;
    near: number;
    far: number;
    viewMatrix: Float32Array;
    projectionMatrix: Float32Array;
}

interface CullingResult {
    visibleObjects: number[];
    hiddenObjects: number[];
    lodChanges: { id: number; newLod: number }[];
    stats: CullingStats;
}

interface CullingStats {
    totalObjects: number;
    visibleObjects: number;
    frustumCulled: number;
    occlusionCulled: number;
    lodUpdates: number;
    processingTime: number;
}

// ============================================================================
// STATE
// ============================================================================

let objects = new Map<number, CullableObject>();
let clusters = new Map<number, Cluster>();
let camera: CameraData | null = null;
let frustum: Frustum | null = null;

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
let occlusionBuffer: Float32Array | null = null;
let occlusionWidth = 256;
let occlusionHeight = 128;

let isInitialized = false;

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

self.onmessage = (event: MessageEvent) => {
    const { type, payload, id } = event.data;
    
    try {
        let result: any;
        
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

function handleInit(payload: any): any {
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

function handleCull(payload: any): CullingResult {
    const startTime = performance.now();
    
    // Update camera if provided
    if (payload.camera) {
        handleUpdateCamera(payload);
    }
    
    if (!camera || !frustum) {
        throw new Error('Camera not set');
    }
    
    const visibleObjects: number[] = [];
    const hiddenObjects: number[] = [];
    const lodChanges: { id: number; newLod: number }[] = [];
    
    let frustumCulled = 0;
    let occlusionCulled = 0;
    let lodUpdates = 0;
    
    // Phase 1: Cluster culling (if enabled)
    const visibleClusters = new Set<number>();
    
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
    
    const stats: CullingStats = {
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

function extractFrustumPlanes(viewProj: Float32Array): Frustum {
    // Extract frustum planes from view-projection matrix
    const planes: Plane[] = [];
    
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
    
    // Bottom plane
    planes.push(createPlane(
        viewProj[3] + viewProj[1],
        viewProj[7] + viewProj[5],
        viewProj[11] + viewProj[9],
        viewProj[15] + viewProj[13]
    ));
    
    // Top plane
    planes.push(createPlane(
        viewProj[3] - viewProj[1],
        viewProj[7] - viewProj[5],
        viewProj[11] - viewProj[9],
        viewProj[15] - viewProj[13]
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

function createPlane(a: number, b: number, c: number, d: number): Plane {
    const length = Math.sqrt(a * a + b * b + c * c);
    return {
        normal: { x: a / length, y: b / length, z: c / length },
        distance: d / length
    };
}

function isSphereInFrustum(sphere: BoundingSphere): boolean {
    if (!frustum) return true;
    
    for (const plane of frustum.planes) {
        const dist = dot(plane.normal, sphere.center) + plane.distance;
        
        if (dist < -sphere.radius) {
            return false; // Completely outside
        }
    }
    
    return true;
}

function isAABBInFrustum(aabb: BoundingBox): boolean {
    if (!frustum) return true;
    
    for (const plane of frustum.planes) {
        // Get the positive vertex (furthest in the direction of the normal)
        const pVertex: Vector3 = {
            x: plane.normal.x >= 0 ? aabb.max.x : aabb.min.x,
            y: plane.normal.y >= 0 ? aabb.max.y : aabb.min.y,
            z: plane.normal.z >= 0 ? aabb.max.z : aabb.min.z
        };
        
        if (dot(plane.normal, pVertex) + plane.distance < 0) {
            return false;
        }
    }
    
    return true;
}

// ============================================================================
// OCCLUSION CULLING
// ============================================================================

function isOccluded(obj: CullableObject): boolean {
    if (!occlusionBuffer || !camera) return false;
    
    // Project bounding sphere to screen
    const screenBounds = projectSphereToScreen(obj.bounds);
    
    if (!screenBounds) return false;
    
    // Sample occlusion buffer at projected bounds
    const { minX, minY, maxX, maxY, nearZ } = screenBounds;
    
    // Convert to buffer coordinates
    const bufMinX = Math.max(0, Math.floor(minX * occlusionWidth));
    const bufMaxX = Math.min(occlusionWidth - 1, Math.ceil(maxX * occlusionWidth));
    const bufMinY = Math.max(0, Math.floor(minY * occlusionHeight));
    const bufMaxY = Math.min(occlusionHeight - 1, Math.ceil(maxY * occlusionHeight));
    
    // Check if any sampled depth is in front
    for (let y = bufMinY; y <= bufMaxY; y++) {
        for (let x = bufMinX; x <= bufMaxX; x++) {
            const idx = y * occlusionWidth + x;
            if (nearZ <= occlusionBuffer[idx]) {
                return false; // Not occluded
            }
        }
    }
    
    return true; // Fully occluded
}

function projectSphereToScreen(sphere: BoundingSphere): { minX: number; minY: number; maxX: number; maxY: number; nearZ: number } | null {
    if (!camera) return null;
    
    // Simple projection: project center and expand by radius
    const viewPos = transformPoint(sphere.center, camera.viewMatrix);
    
    if (viewPos.z >= -camera.near) return null; // Behind camera
    
    const projScale = camera.projectionMatrix[5]; // Near plane projection scale
    const projectedRadius = (sphere.radius * projScale) / -viewPos.z;
    
    // Project center
    const projX = (viewPos.x * projScale / -viewPos.z + 1) * 0.5;
    const projY = (viewPos.y * projScale / -viewPos.z + 1) * 0.5;
    
    return {
        minX: Math.max(0, projX - projectedRadius),
        minY: Math.max(0, projY - projectedRadius),
        maxX: Math.min(1, projX + projectedRadius),
        maxY: Math.min(1, projY + projectedRadius),
        nearZ: (-viewPos.z - sphere.radius) / camera.far
    };
}

function handleUpdateOcclusionBuffer(payload: any): any {
    if (payload.buffer) {
        if (payload.buffer instanceof SharedArrayBuffer) {
            occlusionBuffer = new Float32Array(payload.buffer);
        } else if (payload.buffer instanceof ArrayBuffer) {
            occlusionBuffer = new Float32Array(payload.buffer);
        } else {
            occlusionBuffer = new Float32Array(payload.buffer);
        }
        
        if (payload.width) occlusionWidth = payload.width;
        if (payload.height) occlusionHeight = payload.height;
    }
    
    return { updated: true };
}

// ============================================================================
// LOD SELECTION
// ============================================================================

function selectLOD(obj: CullableObject): number {
    // Distance-based LOD selection
    const distance = obj.distanceToCamera * config.lodBias;
    
    for (let lod = 0; lod < config.lodDistances.length && lod < obj.lodLevels - 1; lod++) {
        if (distance < config.lodDistances[lod]) {
            return lod;
        }
    }
    
    return Math.min(obj.lodLevels - 1, config.lodDistances.length);
}

function calculateScreenSpaceSize(bounds: BoundingSphere, dist: number): number {
    if (!camera || dist <= 0) return 0;
    
    // Calculate approximate screen coverage
    const projectedSize = (bounds.radius * 2) / dist;
    const fovTan = Math.tan(camera.fov * 0.5 * Math.PI / 180);
    
    return projectedSize / (fovTan * 2);
}

// ============================================================================
// OBJECT MANAGEMENT
// ============================================================================

function handleAddObject(payload: any): any {
    const { id, bounds, aabb, lodLevels, cluster } = payload;
    
    const obj: CullableObject = {
        id,
        bounds: bounds || { center: { x: 0, y: 0, z: 0 }, radius: 1 },
        aabb: aabb || { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
        lodLevels: lodLevels || 1,
        currentLod: 0,
        screenSpaceSize: 1,
        distanceToCamera: 0,
        visible: true,
        lastFrameVisible: true,
        cluster
    };
    
    objects.set(id, obj);
    
    // Add to cluster if specified
    if (cluster !== undefined) {
        const clusterObj = clusters.get(cluster);
        if (clusterObj) {
            clusterObj.objects.push(id);
        }
    }
    
    return { added: true, id };
}

function handleUpdateObject(payload: any): any {
    const { id, bounds, aabb, lodLevels } = payload;
    
    const obj = objects.get(id);
    if (!obj) {
        throw new Error(`Object ${id} not found`);
    }
    
    if (bounds) obj.bounds = bounds;
    if (aabb) obj.aabb = aabb;
    if (lodLevels !== undefined) obj.lodLevels = lodLevels;
    
    return { updated: true };
}

function handleRemoveObject(payload: any): any {
    const { id } = payload;
    
    const obj = objects.get(id);
    if (obj && obj.cluster !== undefined) {
        const cluster = clusters.get(obj.cluster);
        if (cluster) {
            cluster.objects = cluster.objects.filter(oid => oid !== id);
        }
    }
    
    objects.delete(id);
    
    return { removed: true };
}

// ============================================================================
// CAMERA MANAGEMENT
// ============================================================================

function handleUpdateCamera(payload: any): any {
    const { position, forward, up, right, fov, aspect, near, far, viewMatrix, projectionMatrix } = payload.camera || payload;
    
    camera = {
        position: position || { x: 0, y: 0, z: 0 },
        forward: forward || { x: 0, y: 0, z: -1 },
        up: up || { x: 0, y: 1, z: 0 },
        right: right || { x: 1, y: 0, z: 0 },
        fov: fov || 60,
        aspect: aspect || 16/9,
        near: near || 0.1,
        far: far || 1000,
        viewMatrix: viewMatrix ? new Float32Array(viewMatrix) : createIdentityMatrix(),
        projectionMatrix: projectionMatrix ? new Float32Array(projectionMatrix) : createIdentityMatrix()
    };
    
    // Extract frustum from matrices
    if (viewMatrix && projectionMatrix) {
        const viewProj = multiplyMatrices(camera.viewMatrix, camera.projectionMatrix);
        frustum = extractFrustumPlanes(viewProj);
    }
    
    return { updated: true };
}

// ============================================================================
// CLUSTER MANAGEMENT
// ============================================================================

function rebuildClusters(): any {
    clusters.clear();
    
    // Group objects spatially
    const sortedObjects = Array.from(objects.values()).sort((a, b) => {
        // Sort by position for spatial coherence
        const posA = a.bounds.center;
        const posB = b.bounds.center;
        return (posA.x + posA.y + posA.z) - (posB.x + posB.y + posB.z);
    });
    
    let clusterId = 0;
    
    for (let i = 0; i < sortedObjects.length; i += config.clusterSize) {
        const clusterObjects = sortedObjects.slice(i, i + config.clusterSize);
        
        // Calculate cluster bounds
        const bounds = calculateClusterBounds(clusterObjects);
        
        const cluster: Cluster = {
            id: clusterId,
            bounds,
            objects: clusterObjects.map(o => o.id),
            visible: true
        };
        
        clusters.set(clusterId, cluster);
        
        // Update objects with cluster reference
        for (const obj of clusterObjects) {
            obj.cluster = clusterId;
        }
        
        clusterId++;
    }
    
    return { 
        rebuilt: true, 
        clusterCount: clusters.size 
    };
}

function calculateClusterBounds(objs: CullableObject[]): BoundingSphere {
    if (objs.length === 0) {
        return { center: { x: 0, y: 0, z: 0 }, radius: 0 };
    }
    
    // Calculate center
    let cx = 0, cy = 0, cz = 0;
    for (const obj of objs) {
        cx += obj.bounds.center.x;
        cy += obj.bounds.center.y;
        cz += obj.bounds.center.z;
    }
    cx /= objs.length;
    cy /= objs.length;
    cz /= objs.length;
    
    // Calculate radius
    let maxRadius = 0;
    for (const obj of objs) {
        const dist = distance(obj.bounds.center, { x: cx, y: cy, z: cz });
        maxRadius = Math.max(maxRadius, dist + obj.bounds.radius);
    }
    
    return {
        center: { x: cx, y: cy, z: cz },
        radius: maxRadius
    };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

function handleSetConfig(payload: any): any {
    config = { ...config, ...payload };
    return { config };
}

function getStats(): any {
    let visibleCount = 0;
    for (const obj of objects.values()) {
        if (obj.visible) visibleCount++;
    }
    
    return {
        totalObjects: objects.size,
        visibleObjects: visibleCount,
        clusters: clusters.size,
        config
    };
}

function handleClear(): any {
    objects.clear();
    clusters.clear();
    
    return { cleared: true };
}

// ============================================================================
// MATH UTILITIES
// ============================================================================

function dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function transformPoint(p: Vector3, m: Float32Array): Vector3 {
    return {
        x: p.x * m[0] + p.y * m[4] + p.z * m[8] + m[12],
        y: p.x * m[1] + p.y * m[5] + p.z * m[9] + m[13],
        z: p.x * m[2] + p.y * m[6] + p.z * m[10] + m[14]
    };
}

function multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
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

function createIdentityMatrix(): Float32Array {
    const m = new Float32Array(16);
    m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
    return m;
}

// Notify that worker is ready
postMessage({ type: 'ready' });
