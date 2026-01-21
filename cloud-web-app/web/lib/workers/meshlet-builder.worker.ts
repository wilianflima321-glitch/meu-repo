/**
 * AETHEL ENGINE - Meshlet Builder Worker
 * =======================================
 * 
 * Web Worker para processamento de geometria em background.
 * Offloads heavy geometry processing from the main thread.
 * 
 * Features:
 * - Meshlet construction from raw geometry
 * - LOD hierarchy generation
 * - Bounding sphere/cone calculation
 * - Cluster simplification
 * - Progress reporting
 * 
 * This runs in a separate thread to keep the UI responsive.
 */

// ============================================================================
// TYPES (duplicated for worker isolation)
// ============================================================================

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Sphere {
  center: Vec3;
  radius: number;
}

interface BoundingCone {
  apex: Vec3;
  axis: Vec3;
  cutoff: number;
}

interface MeshletData {
  id: number;
  vertexOffset: number;
  vertexCount: number;
  triangleOffset: number;
  triangleCount: number;
  boundingSphere: Sphere;
  boundingCone: BoundingCone;
  lodLevel: number;
  parentCluster: number;
  childClusters: number[];
  error: number;
}

interface ClusterData {
  id: number;
  meshletIds: number[];
  boundingSphere: Sphere;
  lodLevel: number;
  parentCluster: number | null;
  childClusters: number[];
  screenSpaceError: number;
}

interface BuildConfig {
  maxMeshletsPerCluster: number;
  targetTrianglesPerMeshlet: number;
  lodBias: number;
  screenSpaceErrorThreshold: number;
}

interface WorkerInput {
  type: 'build' | 'simplify' | 'compute-lod';
  id: string;
  data: {
    vertices: Float32Array;
    indices: Uint32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    config?: Partial<BuildConfig>;
    name?: string;
  };
}

interface WorkerOutput {
  type: 'result' | 'progress' | 'error';
  id: string;
  data?: {
    meshlets: MeshletData[];
    clusters: ClusterData[];
    stats: {
      totalMeshlets: number;
      totalClusters: number;
      lodLevels: number;
      buildTimeMs: number;
    };
  };
  progress?: {
    stage: string;
    percent: number;
  };
  error?: string;
}

// ============================================================================
// VECTOR MATH UTILITIES
// ============================================================================

function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 1, z: 0 };
  return vec3Scale(v, 1 / len);
}

function vec3Distance(a: Vec3, b: Vec3): number {
  return vec3Length(vec3Sub(a, b));
}

function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

// ============================================================================
// MESHLET BUILDER
// ============================================================================

const DEFAULT_CONFIG: BuildConfig = {
  maxMeshletsPerCluster: 128,
  targetTrianglesPerMeshlet: 64,
  lodBias: 1.0,
  screenSpaceErrorThreshold: 1.0,
};

class MeshletBuilderWorker {
  private config: BuildConfig;
  
  constructor(config: Partial<BuildConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Build meshlets from raw geometry
   */
  build(
    vertices: Float32Array,
    indices: Uint32Array,
    onProgress: (stage: string, percent: number) => void
  ): { meshlets: MeshletData[]; clusters: ClusterData[] } {
    onProgress('Building meshlets', 0);
    
    // Step 1: Build meshlets
    const meshlets = this.buildMeshlets(vertices, indices, onProgress);
    onProgress('Building meshlets', 50);
    
    // Step 2: Build cluster hierarchy
    const clusters = this.buildClusterHierarchy(meshlets, vertices, onProgress);
    onProgress('Building clusters', 100);
    
    return { meshlets, clusters };
  }
  
  /**
   * Divide geometry into meshlets
   */
  private buildMeshlets(
    vertices: Float32Array,
    indices: Uint32Array,
    onProgress: (stage: string, percent: number) => void
  ): MeshletData[] {
    const meshlets: MeshletData[] = [];
    const triangleCount = indices.length / 3;
    const targetTriangles = this.config.targetTrianglesPerMeshlet;
    
    let currentMeshlet: MeshletData | null = null;
    let meshletId = 0;
    const vertexRemap = new Map<number, number>();
    let localVertexCount = 0;
    
    for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
      // Report progress every 1000 triangles
      if (triIdx % 1000 === 0) {
        onProgress('Building meshlets', (triIdx / triangleCount) * 50);
      }
      
      // Start new meshlet if needed
      if (!currentMeshlet || currentMeshlet.triangleCount >= targetTriangles) {
        if (currentMeshlet) {
          currentMeshlet.vertexCount = localVertexCount;
          this.computeMeshletBounds(currentMeshlet, vertices, indices);
          meshlets.push(currentMeshlet);
        }
        
        currentMeshlet = {
          id: meshletId++,
          vertexOffset: 0,
          vertexCount: 0,
          triangleOffset: triIdx * 3,
          triangleCount: 0,
          boundingSphere: { center: vec3(), radius: 0 },
          boundingCone: { apex: vec3(), axis: vec3(0, 1, 0), cutoff: 1 },
          lodLevel: 0,
          parentCluster: -1,
          childClusters: [],
          error: 0,
        };
        
        vertexRemap.clear();
        localVertexCount = 0;
      }
      
      // Add triangle to meshlet
      for (let v = 0; v < 3; v++) {
        const globalIdx = indices[triIdx * 3 + v];
        if (!vertexRemap.has(globalIdx)) {
          vertexRemap.set(globalIdx, localVertexCount++);
        }
      }
      
      currentMeshlet.triangleCount++;
    }
    
    // Finalize last meshlet
    if (currentMeshlet && currentMeshlet.triangleCount > 0) {
      currentMeshlet.vertexCount = localVertexCount;
      this.computeMeshletBounds(currentMeshlet, vertices, indices);
      meshlets.push(currentMeshlet);
    }
    
    return meshlets;
  }
  
  /**
   * Compute bounding sphere and cone for a meshlet
   */
  private computeMeshletBounds(
    meshlet: MeshletData,
    vertices: Float32Array,
    indices: Uint32Array
  ): void {
    const points: Vec3[] = [];
    const normals: Vec3[] = [];
    
    for (let i = 0; i < meshlet.triangleCount; i++) {
      const baseIdx = meshlet.triangleOffset + i * 3;
      
      const v0 = this.getVertex(vertices, indices[baseIdx]);
      const v1 = this.getVertex(vertices, indices[baseIdx + 1]);
      const v2 = this.getVertex(vertices, indices[baseIdx + 2]);
      
      points.push(v0, v1, v2);
      
      // Compute triangle normal
      const edge1 = vec3Sub(v1, v0);
      const edge2 = vec3Sub(v2, v0);
      const normal = vec3Normalize(vec3Cross(edge1, edge2));
      normals.push(normal);
    }
    
    // Bounding sphere (Ritter's algorithm)
    meshlet.boundingSphere = this.computeBoundingSphere(points);
    
    // Bounding cone (for backface culling)
    meshlet.boundingCone = this.computeBoundingCone(normals, meshlet.boundingSphere.center);
    
    // Screen-space error (simplified)
    meshlet.error = meshlet.boundingSphere.radius * 0.01 * (meshlet.lodLevel + 1);
  }
  
  private getVertex(vertices: Float32Array, index: number): Vec3 {
    return {
      x: vertices[index * 3],
      y: vertices[index * 3 + 1],
      z: vertices[index * 3 + 2],
    };
  }
  
  private computeBoundingSphere(points: Vec3[]): Sphere {
    if (points.length === 0) {
      return { center: vec3(), radius: 0 };
    }
    
    // Find extreme points
    let minX = points[0], maxX = points[0];
    let minY = points[0], maxY = points[0];
    let minZ = points[0], maxZ = points[0];
    
    for (const p of points) {
      if (p.x < minX.x) minX = p;
      if (p.x > maxX.x) maxX = p;
      if (p.y < minY.y) minY = p;
      if (p.y > maxY.y) maxY = p;
      if (p.z < minZ.z) minZ = p;
      if (p.z > maxZ.z) maxZ = p;
    }
    
    // Largest span
    const spanX = vec3Distance(maxX, minX);
    const spanY = vec3Distance(maxY, minY);
    const spanZ = vec3Distance(maxZ, minZ);
    
    let center: Vec3;
    let radius: number;
    
    if (spanX >= spanY && spanX >= spanZ) {
      center = vec3Lerp(minX, maxX, 0.5);
      radius = spanX / 2;
    } else if (spanY >= spanZ) {
      center = vec3Lerp(minY, maxY, 0.5);
      radius = spanY / 2;
    } else {
      center = vec3Lerp(minZ, maxZ, 0.5);
      radius = spanZ / 2;
    }
    
    // Expand to include all points
    for (const p of points) {
      const dist = vec3Distance(p, center);
      if (dist > radius) {
        const newRadius = (radius + dist) / 2;
        const k = (newRadius - radius) / dist;
        center = vec3Lerp(center, p, k);
        radius = newRadius;
      }
    }
    
    return { center, radius };
  }
  
  private computeBoundingCone(normals: Vec3[], apex: Vec3): BoundingCone {
    if (normals.length === 0) {
      return { apex, axis: vec3(0, 1, 0), cutoff: 1 };
    }
    
    // Average normals
    let avgNormal = vec3();
    for (const n of normals) {
      avgNormal = vec3Add(avgNormal, n);
    }
    avgNormal = vec3Normalize(vec3Scale(avgNormal, 1 / normals.length));
    
    // Find max angle
    let maxDot = 1;
    for (const n of normals) {
      const dot = vec3Dot(avgNormal, n);
      if (dot < maxDot) maxDot = dot;
    }
    
    return { apex, axis: avgNormal, cutoff: maxDot };
  }
  
  /**
   * Build cluster hierarchy for LOD
   */
  private buildClusterHierarchy(
    meshlets: MeshletData[],
    vertices: Float32Array,
    onProgress: (stage: string, percent: number) => void
  ): ClusterData[] {
    const clusters: ClusterData[] = [];
    let clusterId = 0;
    
    // LOD 0 - Clusters from original meshlets
    const meshletsPerCluster = this.config.maxMeshletsPerCluster;
    
    for (let i = 0; i < meshlets.length; i += meshletsPerCluster) {
      const clusterMeshlets = meshlets.slice(i, i + meshletsPerCluster);
      const spheres = clusterMeshlets.map(m => m.boundingSphere);
      const clusterSphere = this.mergeBoundingSpheres(spheres);
      
      clusters.push({
        id: clusterId++,
        meshletIds: clusterMeshlets.map(m => m.id),
        boundingSphere: clusterSphere,
        lodLevel: 0,
        parentCluster: null,
        childClusters: [],
        screenSpaceError: 0,
      });
    }
    
    // Build higher LODs
    let currentLevelClusters = clusters.slice();
    let lodLevel = 1;
    
    while (currentLevelClusters.length > 1) {
      onProgress('Building LOD ' + lodLevel, 50 + (lodLevel * 10));
      
      const nextLevelClusters: ClusterData[] = [];
      
      for (let i = 0; i < currentLevelClusters.length; i += 4) {
        const childClusters = currentLevelClusters.slice(i, Math.min(i + 4, currentLevelClusters.length));
        
        const parentSphere = this.mergeBoundingSpheres(
          childClusters.map(c => c.boundingSphere)
        );
        
        const parentCluster: ClusterData = {
          id: clusterId++,
          meshletIds: childClusters.flatMap(c => c.meshletIds),
          boundingSphere: parentSphere,
          lodLevel,
          parentCluster: null,
          childClusters: childClusters.map(c => c.id),
          screenSpaceError: parentSphere.radius * 0.01 * (lodLevel + 1),
        };
        
        // Update child references
        for (const child of childClusters) {
          child.parentCluster = parentCluster.id;
        }
        
        nextLevelClusters.push(parentCluster);
        clusters.push(parentCluster);
      }
      
      currentLevelClusters = nextLevelClusters;
      lodLevel++;
      
      // Safety limit
      if (lodLevel > 10) break;
    }
    
    return clusters;
  }
  
  private mergeBoundingSpheres(spheres: Sphere[]): Sphere {
    if (spheres.length === 0) {
      return { center: vec3(), radius: 0 };
    }
    
    if (spheres.length === 1) {
      return { ...spheres[0] };
    }
    
    // Find bounding sphere that contains all spheres
    let center = vec3();
    for (const s of spheres) {
      center = vec3Add(center, s.center);
    }
    center = vec3Scale(center, 1 / spheres.length);
    
    let radius = 0;
    for (const s of spheres) {
      const dist = vec3Distance(center, s.center) + s.radius;
      if (dist > radius) radius = dist;
    }
    
    return { center, radius };
  }
}

// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { type, id, data } = event.data;
  
  const sendProgress = (stage: string, percent: number) => {
    const output: WorkerOutput = {
      type: 'progress',
      id,
      progress: { stage, percent },
    };
    self.postMessage(output);
  };
  
  try {
    if (type === 'build') {
      const startTime = performance.now();
      
      const builder = new MeshletBuilderWorker(data.config);
      const { meshlets, clusters } = builder.build(
        data.vertices,
        data.indices,
        sendProgress
      );
      
      const buildTimeMs = performance.now() - startTime;
      
      // Count LOD levels
      let maxLod = 0;
      for (const c of clusters) {
        if (c.lodLevel > maxLod) maxLod = c.lodLevel;
      }
      
      const output: WorkerOutput = {
        type: 'result',
        id,
        data: {
          meshlets,
          clusters,
          stats: {
            totalMeshlets: meshlets.length,
            totalClusters: clusters.length,
            lodLevels: maxLod + 1,
            buildTimeMs,
          },
        },
      };
      
      self.postMessage(output);
    } else {
      throw new Error(`Unknown operation type: ${type}`);
    }
  } catch (error) {
    const output: WorkerOutput = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(output);
  }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });
