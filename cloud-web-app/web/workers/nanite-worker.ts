/**
 * AETHEL ENGINE - Nanite Web Worker
 * 
 * Off-thread geometry processing for:
 * - Nanite-style LOD streaming
 * - Mesh simplification
 * - Cluster generation
 * - Occlusion culling
 * 
 * Runs in Web Worker to avoid blocking main thread.
 */

// ============================================================================
// TYPES
// ============================================================================

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface BoundingBox {
    min: Vector3;
    max: Vector3;
    center: Vector3;
    size: Vector3;
}

interface Triangle {
    indices: [number, number, number];
    normal: Vector3;
    area: number;
}

interface Cluster {
    id: number;
    triangles: number[];
    boundingBox: BoundingBox;
    lodLevel: number;
    parentCluster?: number;
    childClusters?: number[];
    error: number;
}

interface MeshData {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    indices: Uint32Array;
}

interface SimplificationResult {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    indices: Uint32Array;
    error: number;
}

interface ClusterHierarchy {
    clusters: Cluster[];
    lodLevels: number;
    rootClusters: number[];
}

interface WorkerMessage {
    type: 'simplify' | 'cluster' | 'cull' | 'stream';
    id: string;
    data: any;
}

interface WorkerResponse {
    type: string;
    id: string;
    success: boolean;
    data?: any;
    error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLUSTER_TARGET_TRIANGLES = 128;
const MAX_LOD_LEVELS = 8;
const SIMPLIFICATION_RATIO = 0.5;

// ============================================================================
// UTILITIES
// ============================================================================

function vec3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}

function vec3Add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Sub(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Scale(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Cross(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

function vec3Dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Length(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vector3): Vector3 {
    const len = vec3Length(v);
    return len > 0 ? vec3Scale(v, 1 / len) : { x: 0, y: 0, z: 0 };
}

function vec3Min(a: Vector3, b: Vector3): Vector3 {
    return {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        z: Math.min(a.z, b.z)
    };
}

function vec3Max(a: Vector3, b: Vector3): Vector3 {
    return {
        x: Math.max(a.x, b.x),
        y: Math.max(a.y, b.y),
        z: Math.max(a.z, b.z)
    };
}

// ============================================================================
// MESH SIMPLIFICATION (Quadric Error Metrics)
// ============================================================================

class QuadricErrorSimplifier {
    private positions: Float32Array;
    private indices: Uint32Array;
    private normals?: Float32Array;
    private uvs?: Float32Array;
    private vertexCount: number;
    private faceCount: number;
    
    // Quadric matrices per vertex
    private quadrics: Float64Array[];
    
    // Edge collapse heap
    private edgeHeap: { v1: number; v2: number; cost: number; target: Vector3 }[] = [];
    
    constructor(mesh: MeshData) {
        this.positions = new Float32Array(mesh.positions);
        this.indices = new Uint32Array(mesh.indices);
        this.normals = mesh.normals ? new Float32Array(mesh.normals) : undefined;
        this.uvs = mesh.uvs ? new Float32Array(mesh.uvs) : undefined;
        
        this.vertexCount = this.positions.length / 3;
        this.faceCount = this.indices.length / 3;
        
        this.quadrics = [];
        this.initializeQuadrics();
        this.buildEdgeHeap();
    }
    
    private initializeQuadrics(): void {
        // Initialize quadric matrices (4x4 symmetric, stored as 10 floats)
        for (let i = 0; i < this.vertexCount; i++) {
            this.quadrics.push(new Float64Array(10));
        }
        
        // Compute quadric for each face and add to vertices
        for (let f = 0; f < this.faceCount; f++) {
            const i0 = this.indices[f * 3];
            const i1 = this.indices[f * 3 + 1];
            const i2 = this.indices[f * 3 + 2];
            
            const v0 = this.getVertex(i0);
            const v1 = this.getVertex(i1);
            const v2 = this.getVertex(i2);
            
            // Compute face plane
            const edge1 = vec3Sub(v1, v0);
            const edge2 = vec3Sub(v2, v0);
            const normal = vec3Normalize(vec3Cross(edge1, edge2));
            const d = -vec3Dot(normal, v0);
            
            // Compute quadric matrix from plane equation
            const quadric = this.planeToQuadric(normal.x, normal.y, normal.z, d);
            
            // Add to vertex quadrics
            this.addQuadric(this.quadrics[i0], quadric);
            this.addQuadric(this.quadrics[i1], quadric);
            this.addQuadric(this.quadrics[i2], quadric);
        }
    }
    
    private planeToQuadric(a: number, b: number, c: number, d: number): Float64Array {
        // Kp = [a² ab ac ad; ab b² bc bd; ac bc c² cd; ad bd cd d²]
        // Stored as [a², ab, ac, ad, b², bc, bd, c², cd, d²]
        return new Float64Array([
            a * a, a * b, a * c, a * d,
            b * b, b * c, b * d,
            c * c, c * d,
            d * d
        ]);
    }
    
    private addQuadric(target: Float64Array, source: Float64Array): void {
        for (let i = 0; i < 10; i++) {
            target[i] += source[i];
        }
    }
    
    private getVertex(index: number): Vector3 {
        return {
            x: this.positions[index * 3],
            y: this.positions[index * 3 + 1],
            z: this.positions[index * 3 + 2]
        };
    }
    
    private evaluateQuadric(q: Float64Array, v: Vector3): number {
        // vᵀQv = a²x² + 2abxy + 2acxz + 2adx + b²y² + 2bcyz + 2bdy + c²z² + 2cdz + d²
        const x = v.x, y = v.y, z = v.z;
        return q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x +
               q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y +
               q[7] * z * z + 2 * q[8] * z +
               q[9];
    }
    
    private buildEdgeHeap(): void {
        const edgeSet = new Set<string>();
        
        // Collect unique edges
        for (let f = 0; f < this.faceCount; f++) {
            const i0 = this.indices[f * 3];
            const i1 = this.indices[f * 3 + 1];
            const i2 = this.indices[f * 3 + 2];
            
            const edges = [[i0, i1], [i1, i2], [i2, i0]];
            for (const [v1, v2] of edges) {
                const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    this.addEdgeToHeap(v1, v2);
                }
            }
        }
        
        // Sort by cost
        this.edgeHeap.sort((a, b) => a.cost - b.cost);
    }
    
    private addEdgeToHeap(v1: number, v2: number): void {
        const q = new Float64Array(10);
        this.addQuadric(q, this.quadrics[v1]);
        this.addQuadric(q, this.quadrics[v2]);
        
        // Try midpoint as target (simplified - full impl would solve linear system)
        const p1 = this.getVertex(v1);
        const p2 = this.getVertex(v2);
        const target = vec3Scale(vec3Add(p1, p2), 0.5);
        
        const cost = this.evaluateQuadric(q, target);
        
        this.edgeHeap.push({ v1, v2, cost, target });
    }
    
    simplify(targetRatio: number): SimplificationResult {
        const targetFaces = Math.floor(this.faceCount * targetRatio);
        const facesToRemove = this.faceCount - targetFaces;
        
        // Vertex mapping for collapsed vertices
        const vertexMap = new Int32Array(this.vertexCount);
        for (let i = 0; i < this.vertexCount; i++) {
            vertexMap[i] = i;
        }
        
        let removedFaces = 0;
        let maxError = 0;
        
        // Collapse edges
        while (removedFaces < facesToRemove && this.edgeHeap.length > 0) {
            const edge = this.edgeHeap.shift()!;
            
            // Get actual vertices (following collapse chain)
            let v1 = edge.v1;
            let v2 = edge.v2;
            while (vertexMap[v1] !== v1) v1 = vertexMap[v1];
            while (vertexMap[v2] !== v2) v2 = vertexMap[v2];
            
            if (v1 === v2) continue; // Already collapsed
            
            // Collapse v2 into v1
            vertexMap[v2] = v1;
            
            // Update v1 position to target
            this.positions[v1 * 3] = edge.target.x;
            this.positions[v1 * 3 + 1] = edge.target.y;
            this.positions[v1 * 3 + 2] = edge.target.z;
            
            // Merge quadrics
            this.addQuadric(this.quadrics[v1], this.quadrics[v2]);
            
            maxError = Math.max(maxError, edge.cost);
            removedFaces += 2; // Typically removes 2 faces
        }
        
        // Build new index buffer
        const newIndices: number[] = [];
        const usedVertices = new Set<number>();
        
        for (let f = 0; f < this.faceCount; f++) {
            let i0 = this.indices[f * 3];
            let i1 = this.indices[f * 3 + 1];
            let i2 = this.indices[f * 3 + 2];
            
            // Follow collapse chain
            while (vertexMap[i0] !== i0) i0 = vertexMap[i0];
            while (vertexMap[i1] !== i1) i1 = vertexMap[i1];
            while (vertexMap[i2] !== i2) i2 = vertexMap[i2];
            
            // Skip degenerate triangles
            if (i0 === i1 || i1 === i2 || i2 === i0) continue;
            
            newIndices.push(i0, i1, i2);
            usedVertices.add(i0);
            usedVertices.add(i1);
            usedVertices.add(i2);
        }
        
        // Compact vertex buffer
        const vertexRemap = new Map<number, number>();
        let newIndex = 0;
        for (const v of usedVertices) {
            vertexRemap.set(v, newIndex++);
        }
        
        const newPositions = new Float32Array(vertexRemap.size * 3);
        const newNormals = this.normals ? new Float32Array(vertexRemap.size * 3) : undefined;
        const newUVs = this.uvs ? new Float32Array(vertexRemap.size * 2) : undefined;
        
        for (const [oldIdx, newIdx] of vertexRemap) {
            newPositions[newIdx * 3] = this.positions[oldIdx * 3];
            newPositions[newIdx * 3 + 1] = this.positions[oldIdx * 3 + 1];
            newPositions[newIdx * 3 + 2] = this.positions[oldIdx * 3 + 2];
            
            if (newNormals && this.normals) {
                newNormals[newIdx * 3] = this.normals[oldIdx * 3];
                newNormals[newIdx * 3 + 1] = this.normals[oldIdx * 3 + 1];
                newNormals[newIdx * 3 + 2] = this.normals[oldIdx * 3 + 2];
            }
            
            if (newUVs && this.uvs) {
                newUVs[newIdx * 2] = this.uvs[oldIdx * 2];
                newUVs[newIdx * 2 + 1] = this.uvs[oldIdx * 2 + 1];
            }
        }
        
        const remappedIndices = new Uint32Array(newIndices.length);
        for (let i = 0; i < newIndices.length; i++) {
            remappedIndices[i] = vertexRemap.get(newIndices[i])!;
        }
        
        return {
            positions: newPositions,
            normals: newNormals,
            uvs: newUVs,
            indices: remappedIndices,
            error: maxError
        };
    }
}

// ============================================================================
// CLUSTER GENERATION
// ============================================================================

function computeBoundingBox(positions: Float32Array, indices?: number[]): BoundingBox {
    let min = vec3(Infinity, Infinity, Infinity);
    let max = vec3(-Infinity, -Infinity, -Infinity);
    
    const count = indices ? indices.length : positions.length / 3;
    
    for (let i = 0; i < count; i++) {
        const idx = indices ? indices[i] : i;
        const v = vec3(
            positions[idx * 3],
            positions[idx * 3 + 1],
            positions[idx * 3 + 2]
        );
        min = vec3Min(min, v);
        max = vec3Max(max, v);
    }
    
    return {
        min,
        max,
        center: vec3Scale(vec3Add(min, max), 0.5),
        size: vec3Sub(max, min)
    };
}

function generateClusters(mesh: MeshData): ClusterHierarchy {
    const clusters: Cluster[] = [];
    const faceCount = mesh.indices.length / 3;
    
    // Simple spatial clustering based on triangle centroid
    const triangleCentroids: Vector3[] = [];
    
    for (let f = 0; f < faceCount; f++) {
        const i0 = mesh.indices[f * 3];
        const i1 = mesh.indices[f * 3 + 1];
        const i2 = mesh.indices[f * 3 + 2];
        
        const v0 = vec3(mesh.positions[i0 * 3], mesh.positions[i0 * 3 + 1], mesh.positions[i0 * 3 + 2]);
        const v1 = vec3(mesh.positions[i1 * 3], mesh.positions[i1 * 3 + 1], mesh.positions[i1 * 3 + 2]);
        const v2 = vec3(mesh.positions[i2 * 3], mesh.positions[i2 * 3 + 1], mesh.positions[i2 * 3 + 2]);
        
        triangleCentroids.push(vec3Scale(vec3Add(vec3Add(v0, v1), v2), 1/3));
    }
    
    // K-means clustering
    const numClusters = Math.ceil(faceCount / CLUSTER_TARGET_TRIANGLES);
    const clusterAssignments = new Int32Array(faceCount);
    const clusterCentroids: Vector3[] = [];
    
    // Initialize cluster centroids randomly
    for (let i = 0; i < numClusters; i++) {
        const idx = Math.floor(Math.random() * faceCount);
        clusterCentroids.push({ ...triangleCentroids[idx] });
    }
    
    // K-means iterations
    for (let iter = 0; iter < 10; iter++) {
        // Assign triangles to nearest centroid
        for (let f = 0; f < faceCount; f++) {
            let minDist = Infinity;
            let bestCluster = 0;
            
            for (let c = 0; c < numClusters; c++) {
                const diff = vec3Sub(triangleCentroids[f], clusterCentroids[c]);
                const dist = vec3Dot(diff, diff);
                
                if (dist < minDist) {
                    minDist = dist;
                    bestCluster = c;
                }
            }
            
            clusterAssignments[f] = bestCluster;
        }
        
        // Update centroids
        const sums: Vector3[] = clusterCentroids.map(() => vec3(0, 0, 0));
        const counts = new Int32Array(numClusters);
        
        for (let f = 0; f < faceCount; f++) {
            const c = clusterAssignments[f];
            sums[c] = vec3Add(sums[c], triangleCentroids[f]);
            counts[c]++;
        }
        
        for (let c = 0; c < numClusters; c++) {
            if (counts[c] > 0) {
                clusterCentroids[c] = vec3Scale(sums[c], 1 / counts[c]);
            }
        }
    }
    
    // Build cluster objects
    for (let c = 0; c < numClusters; c++) {
        const triangles: number[] = [];
        const vertexIndices: number[] = [];
        
        for (let f = 0; f < faceCount; f++) {
            if (clusterAssignments[f] === c) {
                triangles.push(f);
                vertexIndices.push(
                    mesh.indices[f * 3],
                    mesh.indices[f * 3 + 1],
                    mesh.indices[f * 3 + 2]
                );
            }
        }
        
        if (triangles.length === 0) continue;
        
        const boundingBox = computeBoundingBox(mesh.positions, vertexIndices);
        
        clusters.push({
            id: clusters.length,
            triangles,
            boundingBox,
            lodLevel: 0,
            error: 0
        });
    }
    
    return {
        clusters,
        lodLevels: 1,
        rootClusters: clusters.map(c => c.id)
    };
}

// ============================================================================
// OCCLUSION CULLING
// ============================================================================

interface CullingParams {
    cameraPosition: Vector3;
    cameraDirection: Vector3;
    fov: number;
    aspectRatio: number;
    nearPlane: number;
    farPlane: number;
    screenHeight: number;
    errorThreshold: number;
}

function cullClusters(
    clusters: Cluster[],
    params: CullingParams
): { visible: number[]; toLoad: number[]; toUnload: number[] } {
    const visible: number[] = [];
    const toLoad: number[] = [];
    const toUnload: number[] = [];
    
    for (const cluster of clusters) {
        // Frustum culling (simplified - sphere test)
        const toCamera = vec3Sub(cluster.boundingBox.center, params.cameraPosition);
        const distance = vec3Length(toCamera);
        const radius = vec3Length(cluster.boundingBox.size) / 2;
        
        // Behind camera check
        if (vec3Dot(toCamera, params.cameraDirection) < -radius) {
            toUnload.push(cluster.id);
            continue;
        }
        
        // Far plane check
        if (distance - radius > params.farPlane) {
            toUnload.push(cluster.id);
            continue;
        }
        
        // Screen space error
        const screenSize = (radius / distance) * params.screenHeight / Math.tan(params.fov / 2);
        const screenError = cluster.error * screenSize;
        
        if (screenError < params.errorThreshold) {
            // Use coarser LOD or skip
            if (cluster.parentCluster !== undefined) {
                toUnload.push(cluster.id);
                continue;
            }
        }
        
        visible.push(cluster.id);
        
        // Check if we need to load finer LOD
        if (screenError > params.errorThreshold * 2 && cluster.childClusters) {
            toLoad.push(...cluster.childClusters);
        }
    }
    
    return { visible, toLoad, toUnload };
}

// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, id, data } = event.data;
    
    try {
        let result: any;
        
        switch (type) {
            case 'simplify': {
                const simplifier = new QuadricErrorSimplifier(data.mesh);
                result = simplifier.simplify(data.targetRatio ?? SIMPLIFICATION_RATIO);
                
                // Transfer buffers back
                const transferList = [result.positions.buffer, result.indices.buffer];
                if (result.normals) transferList.push(result.normals.buffer);
                if (result.uvs) transferList.push(result.uvs.buffer);
                
                self.postMessage(
                    { type, id, success: true, data: result } as WorkerResponse,
                    { transfer: transferList }
                );
                return;
            }
            
            case 'cluster': {
                result = generateClusters(data.mesh);
                break;
            }
            
            case 'cull': {
                result = cullClusters(data.clusters, data.params);
                break;
            }
            
            case 'stream': {
                // Generate full LOD hierarchy
                const mesh = data.mesh as MeshData;
                const hierarchy: { lod: number; mesh: SimplificationResult }[] = [];
                
                let currentMesh = mesh;
                let lodLevel = 0;
                
                while (currentMesh.indices.length > 1000 && lodLevel < MAX_LOD_LEVELS) {
                    const simplifier = new QuadricErrorSimplifier(currentMesh);
                    const simplified = simplifier.simplify(SIMPLIFICATION_RATIO);
                    
                    hierarchy.push({ lod: lodLevel, mesh: simplified });
                    
                    currentMesh = {
                        positions: simplified.positions,
                        normals: simplified.normals,
                        uvs: simplified.uvs,
                        indices: simplified.indices
                    };
                    
                    lodLevel++;
                }
                
                result = { hierarchy };
                break;
            }
            
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

// Signal that worker is ready
self.postMessage({ type: 'ready', id: 'init', success: true });

export {};
