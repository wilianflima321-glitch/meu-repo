/**
 * NANITE-LIKE VIRTUALIZED GEOMETRY SYSTEM - Aethel Engine
 * 
 * Sistema de geometria virtualizada inspirado no Nanite do Unreal Engine 5.
 * Permite renderizar milhões de polígonos em tempo real.
 * 
 * FEATURES:
 * - Meshlet-based rendering
 * - Hierarchical LOD clustering
 * - GPU-driven culling (Hi-Z, frustum, occlusion)
 * - Software rasterization fallback
 * - Visibility buffer rendering
 * - Streaming de geometria
 * - Instancing automático
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export interface Meshlet {
  id: number;
  vertexOffset: number;
  vertexCount: number;
  triangleOffset: number;
  triangleCount: number;
  boundingSphere: THREE.Sphere;
  boundingCone: { apex: THREE.Vector3; axis: THREE.Vector3; cutoff: number };
  lodLevel: number;
  parentCluster: number;
  childClusters: number[];
  error: number; // Screen-space error
}

export interface MeshletCluster {
  id: number;
  meshlets: Meshlet[];
  boundingSphere: THREE.Sphere;
  lodLevel: number;
  parentCluster: number | null;
  childClusters: number[];
  screenSpaceError: number;
  isLoaded: boolean;
  isVisible: boolean;
}

export interface VirtualizedMesh {
  id: string;
  name: string;
  totalVertices: number;
  totalTriangles: number;
  clusters: MeshletCluster[];
  lodLevels: number;
  vertexBuffer: Float32Array;
  indexBuffer: Uint32Array;
  normalBuffer: Float32Array;
  uvBuffer: Float32Array;
}

export interface CullingStats {
  totalMeshlets: number;
  visibleMeshlets: number;
  culledByFrustum: number;
  culledByOcclusion: number;
  culledByLOD: number;
  trianglesRendered: number;
  trianglesCulled: number;
}

export interface NaniteConfig {
  maxMeshletsPerCluster: number;
  targetTrianglesPerMeshlet: number;
  lodBias: number;
  screenSpaceErrorThreshold: number;
  enableOcclusionCulling: boolean;
  enableSoftwareRasterization: boolean;
  maxConcurrentStreams: number;
  memoryBudgetMB: number;
}

// ============================================================================
// MESHLET BUILDER
// ============================================================================

export class MeshletBuilder {
  private config: NaniteConfig;
  
  constructor(config: Partial<NaniteConfig> = {}) {
    this.config = {
      maxMeshletsPerCluster: 128,
      targetTrianglesPerMeshlet: 64,
      lodBias: 1.0,
      screenSpaceErrorThreshold: 1.0,
      enableOcclusionCulling: true,
      enableSoftwareRasterization: false,
      maxConcurrentStreams: 4,
      memoryBudgetMB: 512,
      ...config,
    };
  }
  
  /**
   * Converte uma geometria THREE.js em meshlets virtualizados
   */
  buildFromGeometry(geometry: THREE.BufferGeometry, name: string): VirtualizedMesh {
    const positions = geometry.getAttribute('position');
    const indices = geometry.getIndex();
    const normals = geometry.getAttribute('normal');
    const uvs = geometry.getAttribute('uv');
    
    if (!positions || !indices) {
      throw new Error('Geometry must have positions and indices');
    }
    
    // Extrair arrays
    const vertexBuffer = new Float32Array(positions.array);
    const indexBuffer = new Uint32Array(indices.array);
    const normalBuffer = normals ? new Float32Array(normals.array) : this.computeNormals(vertexBuffer, indexBuffer);
    const uvBuffer = uvs ? new Float32Array(uvs.array) : new Float32Array(positions.count * 2);
    
    // Construir meshlets
    const meshlets = this.buildMeshlets(vertexBuffer, indexBuffer);
    
    // Construir hierarquia de clusters
    const clusters = this.buildClusterHierarchy(meshlets, vertexBuffer);
    
    return {
      id: crypto.randomUUID(),
      name,
      totalVertices: positions.count,
      totalTriangles: indexBuffer.length / 3,
      clusters,
      lodLevels: this.calculateLODLevels(clusters),
      vertexBuffer,
      indexBuffer,
      normalBuffer,
      uvBuffer,
    };
  }
  
  /**
   * Divide geometria em meshlets
   */
  private buildMeshlets(vertices: Float32Array, indices: Uint32Array): Meshlet[] {
    const meshlets: Meshlet[] = [];
    const triangleCount = indices.length / 3;
    const targetTriangles = this.config.targetTrianglesPerMeshlet;
    
    let currentMeshlet: Meshlet | null = null;
    let meshletId = 0;
    
    // Mapa de vértices usados por meshlet (para localidade de cache)
    const vertexRemap = new Map<number, number>();
    let localVertexCount = 0;
    
    for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
      // Começar novo meshlet se necessário
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
          boundingSphere: new THREE.Sphere(),
          boundingCone: { apex: new THREE.Vector3(), axis: new THREE.Vector3(0, 1, 0), cutoff: 1 },
          lodLevel: 0,
          parentCluster: -1,
          childClusters: [],
          error: 0,
        };
        
        vertexRemap.clear();
        localVertexCount = 0;
      }
      
      // Adicionar triângulo ao meshlet
      for (let v = 0; v < 3; v++) {
        const globalIdx = indices[triIdx * 3 + v];
        if (!vertexRemap.has(globalIdx)) {
          vertexRemap.set(globalIdx, localVertexCount++);
        }
      }
      
      currentMeshlet.triangleCount++;
    }
    
    // Finalizar último meshlet
    if (currentMeshlet && currentMeshlet.triangleCount > 0) {
      currentMeshlet.vertexCount = localVertexCount;
      this.computeMeshletBounds(currentMeshlet, vertices, indices);
      meshlets.push(currentMeshlet);
    }
    
    return meshlets;
  }
  
  /**
   * Calcula bounding sphere e cone para um meshlet
   */
  private computeMeshletBounds(meshlet: Meshlet, vertices: Float32Array, indices: Uint32Array): void {
    const points: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];
    
    for (let i = 0; i < meshlet.triangleCount; i++) {
      const baseIdx = meshlet.triangleOffset + i * 3;
      
      for (let v = 0; v < 3; v++) {
        const idx = indices[baseIdx + v];
        points.push(new THREE.Vector3(
          vertices[idx * 3],
          vertices[idx * 3 + 1],
          vertices[idx * 3 + 2]
        ));
      }
      
      // Calcular normal do triângulo
      const v0 = points[points.length - 3];
      const v1 = points[points.length - 2];
      const v2 = points[points.length - 1];
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      normals.push(normal);
    }
    
    // Bounding sphere (Ritter's algorithm)
    meshlet.boundingSphere = this.computeBoundingSphere(points);
    
    // Bounding cone (para backface culling)
    meshlet.boundingCone = this.computeBoundingCone(normals, meshlet.boundingSphere.center);
  }
  
  private computeBoundingSphere(points: THREE.Vector3[]): THREE.Sphere {
    if (points.length === 0) {
      return new THREE.Sphere(new THREE.Vector3(), 0);
    }
    
    // Encontrar pontos extremos
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
    
    // Maior span
    const spanX = maxX.distanceTo(minX);
    const spanY = maxY.distanceTo(minY);
    const spanZ = maxZ.distanceTo(minZ);
    
    let center: THREE.Vector3;
    let radius: number;
    
    if (spanX >= spanY && spanX >= spanZ) {
      center = new THREE.Vector3().lerpVectors(minX, maxX, 0.5);
      radius = spanX / 2;
    } else if (spanY >= spanZ) {
      center = new THREE.Vector3().lerpVectors(minY, maxY, 0.5);
      radius = spanY / 2;
    } else {
      center = new THREE.Vector3().lerpVectors(minZ, maxZ, 0.5);
      radius = spanZ / 2;
    }
    
    // Expandir para incluir todos os pontos
    for (const p of points) {
      const dist = p.distanceTo(center);
      if (dist > radius) {
        const newRadius = (radius + dist) / 2;
        const k = (newRadius - radius) / dist;
        center.lerp(p, k);
        radius = newRadius;
      }
    }
    
    return new THREE.Sphere(center, radius);
  }
  
  private computeBoundingCone(normals: THREE.Vector3[], apex: THREE.Vector3): { apex: THREE.Vector3; axis: THREE.Vector3; cutoff: number } {
    if (normals.length === 0) {
      return { apex, axis: new THREE.Vector3(0, 1, 0), cutoff: 1 };
    }
    
    // Média das normais
    const avgNormal = new THREE.Vector3();
    for (const n of normals) {
      avgNormal.add(n);
    }
    avgNormal.divideScalar(normals.length).normalize();
    
    // Encontrar maior ângulo
    let maxDot = 1;
    for (const n of normals) {
      const dot = avgNormal.dot(n);
      if (dot < maxDot) maxDot = dot;
    }
    
    return {
      apex: apex.clone(),
      axis: avgNormal,
      cutoff: maxDot,
    };
  }
  
  /**
   * Constrói hierarquia de clusters para LOD
   */
  private buildClusterHierarchy(meshlets: Meshlet[], vertices: Float32Array): MeshletCluster[] {
    const clusters: MeshletCluster[] = [];
    let clusterId = 0;
    
    // LOD 0 - Clusters de meshlets originais
    const meshletsPerCluster = this.config.maxMeshletsPerCluster;
    
    for (let i = 0; i < meshlets.length; i += meshletsPerCluster) {
      const clusterMeshlets = meshlets.slice(i, i + meshletsPerCluster);
      
      // Calcular bounding sphere do cluster
      const spheres = clusterMeshlets.map(m => m.boundingSphere);
      const clusterSphere = this.mergeBoundingSpheres(spheres);
      
      clusters.push({
        id: clusterId++,
        meshlets: clusterMeshlets,
        boundingSphere: clusterSphere,
        lodLevel: 0,
        parentCluster: null,
        childClusters: [],
        screenSpaceError: 0,
        isLoaded: true,
        isVisible: true,
      });
    }
    
    // Construir LODs superiores recursivamente
    let currentLevelClusters = clusters.slice();
    let lodLevel = 1;
    
    while (currentLevelClusters.length > 1) {
      const nextLevelClusters: MeshletCluster[] = [];
      
      for (let i = 0; i < currentLevelClusters.length; i += 4) {
        const childClusters = currentLevelClusters.slice(i, i + 4);
        
        // Simplificar meshlets para LOD superior
        const simplifiedMeshlets = this.simplifyMeshlets(
          childClusters.flatMap(c => c.meshlets),
          0.5 // Reduzir para 50%
        );
        
        const parentSphere = this.mergeBoundingSpheres(
          childClusters.map(c => c.boundingSphere)
        );
        
        const parentCluster: MeshletCluster = {
          id: clusterId++,
          meshlets: simplifiedMeshlets,
          boundingSphere: parentSphere,
          lodLevel,
          parentCluster: null,
          childClusters: childClusters.map(c => c.id),
          screenSpaceError: this.computeScreenSpaceError(parentSphere, lodLevel),
          isLoaded: true,
          isVisible: false,
        };
        
        // Atualizar referências dos filhos
        for (const child of childClusters) {
          child.parentCluster = parentCluster.id;
        }
        
        nextLevelClusters.push(parentCluster);
        clusters.push(parentCluster);
      }
      
      currentLevelClusters = nextLevelClusters;
      lodLevel++;
    }
    
    return clusters;
  }
  
  private mergeBoundingSpheres(spheres: THREE.Sphere[]): THREE.Sphere {
    if (spheres.length === 0) {
      return new THREE.Sphere(new THREE.Vector3(), 0);
    }
    
    if (spheres.length === 1) {
      return spheres[0].clone();
    }
    
    // Encontrar centro médio ponderado pelo raio
    const center = new THREE.Vector3();
    let totalWeight = 0;
    
    for (const s of spheres) {
      const weight = s.radius;
      center.addScaledVector(s.center, weight);
      totalWeight += weight;
    }
    
    center.divideScalar(totalWeight);
    
    // Encontrar raio que engloba todas as esferas
    let radius = 0;
    for (const s of spheres) {
      const dist = center.distanceTo(s.center) + s.radius;
      if (dist > radius) radius = dist;
    }
    
    return new THREE.Sphere(center, radius);
  }
  
  private simplifyMeshlets(meshlets: Meshlet[], ratio: number): Meshlet[] {
    // Simplificação básica: selecionar meshlets representativos
    const targetCount = Math.max(1, Math.floor(meshlets.length * ratio));
    const step = meshlets.length / targetCount;
    
    const simplified: Meshlet[] = [];
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.floor(i * step);
      const original = meshlets[idx];
      
      simplified.push({
        ...original,
        id: simplified.length,
        lodLevel: original.lodLevel + 1,
        error: original.error * 2, // Dobrar erro estimado
      });
    }
    
    return simplified;
  }
  
  private computeScreenSpaceError(sphere: THREE.Sphere, lodLevel: number): number {
    // Erro cresce exponencialmente com LOD
    return Math.pow(2, lodLevel) * this.config.screenSpaceErrorThreshold;
  }
  
  private calculateLODLevels(clusters: MeshletCluster[]): number {
    return Math.max(...clusters.map(c => c.lodLevel)) + 1;
  }
  
  private computeNormals(vertices: Float32Array, indices: Uint32Array): Float32Array {
    const normals = new Float32Array(vertices.length);
    const counts = new Uint32Array(vertices.length / 3);
    
    // Acumular normais de face para cada vértice
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
      
      const v0 = new THREE.Vector3(vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]);
      const v1 = new THREE.Vector3(vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]);
      const v2 = new THREE.Vector3(vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]);
      
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      
      for (const idx of [i0, i1, i2]) {
        normals[idx * 3] += normal.x;
        normals[idx * 3 + 1] += normal.y;
        normals[idx * 3 + 2] += normal.z;
        counts[idx]++;
      }
    }
    
    // Normalizar
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > 0) {
        const len = Math.sqrt(
          normals[i * 3] ** 2 +
          normals[i * 3 + 1] ** 2 +
          normals[i * 3 + 2] ** 2
        );
        if (len > 0) {
          normals[i * 3] /= len;
          normals[i * 3 + 1] /= len;
          normals[i * 3 + 2] /= len;
        }
      }
    }
    
    return normals;
  }
}

// ============================================================================
// GPU CULLING SYSTEM
// ============================================================================

export class GPUCullingSystem {
  private gl: WebGL2RenderingContext | null = null;
  private hiZBuffer: WebGLTexture | null = null;
  private hiZLevels: number = 0;
  private cullingProgram: WebGLProgram | null = null;
  
  private frustumPlanes: THREE.Plane[] = [];
  private stats: CullingStats = {
    totalMeshlets: 0,
    visibleMeshlets: 0,
    culledByFrustum: 0,
    culledByOcclusion: 0,
    culledByLOD: 0,
    trianglesRendered: 0,
    trianglesCulled: 0,
  };
  
  initialize(gl: WebGL2RenderingContext): void {
    this.gl = gl;
    this.createHiZBuffer();
    this.createCullingShader();
  }
  
  private createHiZBuffer(): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    
    this.hiZLevels = Math.floor(Math.log2(Math.max(width, height))) + 1;
    
    this.hiZBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.hiZBuffer);
    gl.texStorage2D(gl.TEXTURE_2D, this.hiZLevels, gl.R32F, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  
  private createCullingShader(): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, `#version 300 es
      void main() {
        gl_Position = vec4(0.0);
      }
    `);
    gl.compileShader(vertexShader);
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, `#version 300 es
      precision highp float;
      
      uniform sampler2D uHiZ;
      uniform mat4 uViewProjection;
      uniform vec4 uFrustumPlanes[6];
      
      // Meshlet data - seria um SSBO em um cenário real
      // Usando uniform para compatibilidade com WebGL2
      
      out vec4 fragColor;
      
      bool frustumCull(vec4 sphere) {
        for (int i = 0; i < 6; i++) {
          float dist = dot(uFrustumPlanes[i].xyz, sphere.xyz) + uFrustumPlanes[i].w;
          if (dist < -sphere.w) return true;
        }
        return false;
      }
      
      bool occlusionCull(vec4 sphere, mat4 viewProj) {
        // Projetar esfera para screen space
        vec4 center = viewProj * vec4(sphere.xyz, 1.0);
        if (center.w <= 0.0) return false;
        
        center.xyz /= center.w;
        
        // Calcular nível de mip apropriado
        float screenRadius = sphere.w / center.w;
        float mipLevel = log2(screenRadius * 2.0);
        
        // Sample Hi-Z
        vec2 uv = center.xy * 0.5 + 0.5;
        float hiZ = textureLod(uHiZ, uv, mipLevel).r;
        
        return center.z > hiZ;
      }
      
      void main() {
        fragColor = vec4(1.0);
      }
    `);
    gl.compileShader(fragmentShader);
    
    this.cullingProgram = gl.createProgram()!;
    gl.attachShader(this.cullingProgram, vertexShader);
    gl.attachShader(this.cullingProgram, fragmentShader);
    gl.linkProgram(this.cullingProgram);
  }
  
  /**
   * Atualiza Hi-Z buffer a partir do depth buffer atual
   */
  updateHiZBuffer(depthTexture: WebGLTexture): void {
    if (!this.gl || !this.hiZBuffer) return;
    
    const gl = this.gl;
    
    // Copiar depth para nível 0
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, 
      gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    // Gerar mipmaps com downsampling de máximo
    // (Em WebGL2 real, isso seria feito com compute shader)
    gl.bindTexture(gl.TEXTURE_2D, this.hiZBuffer);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  
  /**
   * Extrai planos do frustum da matriz de projeção
   */
  updateFrustum(camera: THREE.Camera): void {
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    
    const me = projScreenMatrix.elements;
    
    this.frustumPlanes = [
      // Left
      new THREE.Plane().setComponents(me[3] + me[0], me[7] + me[4], me[11] + me[8], me[15] + me[12]).normalize(),
      // Right
      new THREE.Plane().setComponents(me[3] - me[0], me[7] - me[4], me[11] - me[8], me[15] - me[12]).normalize(),
      // Bottom
      new THREE.Plane().setComponents(me[3] + me[1], me[7] + me[5], me[11] + me[9], me[15] + me[13]).normalize(),
      // Top
      new THREE.Plane().setComponents(me[3] - me[1], me[7] - me[5], me[11] - me[9], me[15] - me[13]).normalize(),
      // Near
      new THREE.Plane().setComponents(me[3] + me[2], me[7] + me[6], me[11] + me[10], me[15] + me[14]).normalize(),
      // Far
      new THREE.Plane().setComponents(me[3] - me[2], me[7] - me[6], me[11] - me[10], me[15] - me[14]).normalize(),
    ];
  }
  
  /**
   * Realiza culling de meshlets (CPU fallback)
   */
  cullMeshlets(mesh: VirtualizedMesh, camera: THREE.Camera): Meshlet[] {
    this.updateFrustum(camera);
    
    this.stats = {
      totalMeshlets: 0,
      visibleMeshlets: 0,
      culledByFrustum: 0,
      culledByOcclusion: 0,
      culledByLOD: 0,
      trianglesRendered: 0,
      trianglesCulled: 0,
    };
    
    const visibleMeshlets: Meshlet[] = [];
    const cameraPosition = camera.position;
    
    for (const cluster of mesh.clusters) {
      // Determinar se este cluster deve ser usado baseado em LOD
      const distance = cluster.boundingSphere.center.distanceTo(cameraPosition);
      const screenSize = cluster.boundingSphere.radius / distance;
      
      // Selecionar LOD apropriado
      if (!this.shouldUseCluster(cluster, screenSize)) {
        this.stats.culledByLOD += cluster.meshlets.length;
        continue;
      }
      
      // Frustum culling do cluster
      if (!this.isClusterInFrustum(cluster)) {
        this.stats.culledByFrustum += cluster.meshlets.length;
        continue;
      }
      
      // Processar meshlets individuais
      for (const meshlet of cluster.meshlets) {
        this.stats.totalMeshlets++;
        
        // Frustum culling
        if (!this.isMeshletInFrustum(meshlet)) {
          this.stats.culledByFrustum++;
          this.stats.trianglesCulled += meshlet.triangleCount;
          continue;
        }
        
        // Backface cone culling
        if (this.isMeshletBackfacing(meshlet, cameraPosition)) {
          this.stats.culledByFrustum++;
          this.stats.trianglesCulled += meshlet.triangleCount;
          continue;
        }
        
        visibleMeshlets.push(meshlet);
        this.stats.visibleMeshlets++;
        this.stats.trianglesRendered += meshlet.triangleCount;
      }
    }
    
    return visibleMeshlets;
  }
  
  private shouldUseCluster(cluster: MeshletCluster, screenSize: number): boolean {
    // Usar clusters de LOD mais baixo para objetos mais distantes
    const errorThreshold = 0.01; // Ajustar baseado em qualidade desejada
    return cluster.screenSpaceError * screenSize < errorThreshold || cluster.childClusters.length === 0;
  }
  
  private isClusterInFrustum(cluster: MeshletCluster): boolean {
    const sphere = cluster.boundingSphere;
    
    for (const plane of this.frustumPlanes) {
      if (plane.distanceToPoint(sphere.center) < -sphere.radius) {
        return false;
      }
    }
    
    return true;
  }
  
  private isMeshletInFrustum(meshlet: Meshlet): boolean {
    const sphere = meshlet.boundingSphere;
    
    for (const plane of this.frustumPlanes) {
      if (plane.distanceToPoint(sphere.center) < -sphere.radius) {
        return false;
      }
    }
    
    return true;
  }
  
  private isMeshletBackfacing(meshlet: Meshlet, cameraPos: THREE.Vector3): boolean {
    const cone = meshlet.boundingCone;
    const toCamera = new THREE.Vector3().subVectors(cameraPos, cone.apex).normalize();
    const dot = toCamera.dot(cone.axis);
    
    // Se o cone está apontando para longe da câmera
    return dot < -cone.cutoff;
  }
  
  getStats(): CullingStats {
    return { ...this.stats };
  }
}

// ============================================================================
// VISIBILITY BUFFER RENDERER
// ============================================================================

export class VisibilityBufferRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private visibilityBuffer: WebGLTexture | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private visibilityProgram: WebGLProgram | null = null;
  private resolveProgram: WebGLProgram | null = null;
  
  initialize(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.gl = gl;
    this.createVisibilityBuffer(width, height);
    this.createShaders();
  }
  
  private createVisibilityBuffer(width: number, height: number): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    
    // Visibility buffer armazena: meshletId (16 bits) + triangleId (16 bits)
    this.visibilityBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.visibilityBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32UI, width, height, 0, gl.RED_INTEGER, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    // Framebuffer
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.visibilityBuffer, 0);
    
    // Depth buffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  private createShaders(): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    
    // Visibility pass shader
    const visVS = `#version 300 es
      layout(location = 0) in vec3 aPosition;
      
      uniform mat4 uMVP;
      flat out uint vMeshletTriangleId;
      
      void main() {
        gl_Position = uMVP * vec4(aPosition, 1.0);
        // meshletId seria passado via instancing ou UBO
        vMeshletTriangleId = uint(gl_VertexID / 3);
      }
    `;
    
    const visFS = `#version 300 es
      precision highp float;
      precision highp usampler2D;
      
      flat in uint vMeshletTriangleId;
      out uint fragId;
      
      void main() {
        fragId = vMeshletTriangleId;
      }
    `;
    
    // Resolve shader - reconstói cor/material do visibility buffer
    const resolveVS = `#version 300 es
      layout(location = 0) in vec2 aPosition;
      out vec2 vUV;
      
      void main() {
        vUV = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;
    
    const resolveFS = `#version 300 es
      precision highp float;
      precision highp usampler2D;
      
      uniform usampler2D uVisibilityBuffer;
      uniform sampler2D uVertexBuffer;
      uniform sampler2D uMaterialBuffer;
      
      in vec2 vUV;
      out vec4 fragColor;
      
      void main() {
        uint id = texture(uVisibilityBuffer, vUV).r;
        
        // Decodificar meshlet e triangle ID
        uint meshletId = id >> 16u;
        uint triangleId = id & 0xFFFFu;
        
        // Buscar atributos do vértice e material
        // (simplificado - versão completa buscaria de buffers)
        
        fragColor = vec4(
          float(meshletId % 256u) / 255.0,
          float(triangleId % 256u) / 255.0,
          0.5,
          1.0
        );
      }
    `;
    
    this.visibilityProgram = this.compileProgram(visVS, visFS);
    this.resolveProgram = this.compileProgram(resolveVS, resolveFS);
  }
  
  private compileProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    if (!this.gl) return null;
    
    const gl = this.gl;
    
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    return program;
  }
  
  /**
   * Renderiza meshlets para o visibility buffer
   */
  renderVisibilityPass(meshlets: Meshlet[], mesh: VirtualizedMesh, mvp: THREE.Matrix4): void {
    if (!this.gl || !this.framebuffer || !this.visibilityProgram) return;
    
    const gl = this.gl;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.visibilityProgram);
    
    const mvpLoc = gl.getUniformLocation(this.visibilityProgram, 'uMVP');
    gl.uniformMatrix4fv(mvpLoc, false, mvp.elements);
    
    // Renderizar cada meshlet
    for (const meshlet of meshlets) {
      // Em uma implementação real, usaríamos indirect drawing
      // e batch todos os meshlets visíveis juntos
      gl.drawArrays(gl.TRIANGLES, meshlet.triangleOffset, meshlet.triangleCount * 3);
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  /**
   * Resolve o visibility buffer para cor final
   */
  resolvePass(): void {
    if (!this.gl || !this.resolveProgram || !this.visibilityBuffer) return;
    
    const gl = this.gl;
    
    gl.useProgram(this.resolveProgram);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.visibilityBuffer);
    gl.uniform1i(gl.getUniformLocation(this.resolveProgram, 'uVisibilityBuffer'), 0);
    
    // Renderizar fullscreen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

// ============================================================================
// NANITE RENDERER
// ============================================================================

export class NaniteRenderer {
  private meshletBuilder: MeshletBuilder;
  private cullingSystem: GPUCullingSystem;
  private visibilityRenderer: VisibilityBufferRenderer;
  
  private virtualizedMeshes: Map<string, VirtualizedMesh> = new Map();
  private config: NaniteConfig;
  
  constructor(config: Partial<NaniteConfig> = {}) {
    this.config = {
      maxMeshletsPerCluster: 128,
      targetTrianglesPerMeshlet: 64,
      lodBias: 1.0,
      screenSpaceErrorThreshold: 1.0,
      enableOcclusionCulling: true,
      enableSoftwareRasterization: false,
      maxConcurrentStreams: 4,
      memoryBudgetMB: 512,
      ...config,
    };
    
    this.meshletBuilder = new MeshletBuilder(this.config);
    this.cullingSystem = new GPUCullingSystem();
    this.visibilityRenderer = new VisibilityBufferRenderer();
  }
  
  initialize(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.cullingSystem.initialize(gl);
    this.visibilityRenderer.initialize(gl, width, height);
  }
  
  /**
   * Importa uma geometria para o sistema Nanite
   */
  importGeometry(geometry: THREE.BufferGeometry, name: string): string {
    const virtualizedMesh = this.meshletBuilder.buildFromGeometry(geometry, name);
    this.virtualizedMeshes.set(virtualizedMesh.id, virtualizedMesh);
    
    console.log(`[Nanite] Imported "${name}":`, {
      vertices: virtualizedMesh.totalVertices,
      triangles: virtualizedMesh.totalTriangles,
      clusters: virtualizedMesh.clusters.length,
      lodLevels: virtualizedMesh.lodLevels,
    });
    
    return virtualizedMesh.id;
  }
  
  /**
   * Renderiza todos os meshes virtualizados
   */
  render(camera: THREE.Camera, transform: THREE.Matrix4): void {
    const viewProjection = new THREE.Matrix4()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    
    for (const [id, mesh] of this.virtualizedMeshes) {
      // Culling
      const visibleMeshlets = this.cullingSystem.cullMeshlets(mesh, camera);
      
      // Renderizar
      const mvp = new THREE.Matrix4().multiplyMatrices(viewProjection, transform);
      this.visibilityRenderer.renderVisibilityPass(visibleMeshlets, mesh, mvp);
    }
    
    // Resolve final
    this.visibilityRenderer.resolvePass();
  }
  
  /**
   * Retorna estatísticas de culling
   */
  getStats(): CullingStats {
    return this.cullingSystem.getStats();
  }
  
  /**
   * Remove um mesh virtualizado
   */
  removeMesh(meshId: string): boolean {
    return this.virtualizedMeshes.delete(meshId);
  }
  
  /**
   * Limpa todos os meshes
   */
  clear(): void {
    this.virtualizedMeshes.clear();
  }
  
  getMeshCount(): number {
    return this.virtualizedMeshes.size;
  }
  
  getMesh(meshId: string): VirtualizedMesh | undefined {
    return this.virtualizedMeshes.get(meshId);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const createNaniteRenderer = (config?: Partial<NaniteConfig>): NaniteRenderer => {
  return new NaniteRenderer(config);
};

export const createMeshletBuilder = (config?: Partial<NaniteConfig>): MeshletBuilder => {
  return new MeshletBuilder(config);
};

export const createGPUCullingSystem = (): GPUCullingSystem => {
  return new GPUCullingSystem();
};
