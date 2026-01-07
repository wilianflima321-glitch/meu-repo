/**
 * Auto-LOD Pipeline - Sistema de Geração Automática de Níveis de Detalhe
 * 
 * Este sistema processa assets 3D e gera automaticamente versões LOD
 * otimizadas para diferentes distâncias de visualização.
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export interface LODLevel {
  level: number;
  distance: number;
  triangleRatio: number; // 0-1, porcentagem de triângulos mantidos
  textureScale: number;  // 0-1, escala de textura
}

export interface LODConfig {
  levels: LODLevel[];
  algorithm: 'quadric' | 'vertex-cluster' | 'edge-collapse';
  preserveUVSeams: boolean;
  preserveNormals: boolean;
  targetErrorThreshold: number;
  generateAtlas: boolean;
  atlasSize: number;
}

export interface MeshAnalysis {
  triangleCount: number;
  vertexCount: number;
  boundingBox: THREE.Box3;
  boundingSphere: THREE.Sphere;
  surfaceArea: number;
  volume: number;
  complexity: 'low' | 'medium' | 'high' | 'ultra';
  materialCount: number;
  hasUVs: boolean;
  hasNormals: boolean;
  hasTangents: boolean;
}

export interface LODResult {
  originalMesh: THREE.BufferGeometry;
  lodMeshes: Map<number, THREE.BufferGeometry>;
  analysis: MeshAnalysis;
  processingTime: number;
  memoryReduction: number;
}

export interface AssetLODEntry {
  assetId: string;
  assetPath: string;
  config: LODConfig;
  result?: LODResult;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_LOD_LEVELS: LODLevel[] = [
  { level: 0, distance: 0, triangleRatio: 1.0, textureScale: 1.0 },    // Full detail
  { level: 1, distance: 25, triangleRatio: 0.5, textureScale: 0.5 },  // Medium
  { level: 2, distance: 50, triangleRatio: 0.25, textureScale: 0.25 }, // Low
  { level: 3, distance: 100, triangleRatio: 0.1, textureScale: 0.125 }, // Very Low
  { level: 4, distance: 200, triangleRatio: 0.05, textureScale: 0 },   // Billboard/Impostor
];

export const DEFAULT_LOD_CONFIG: LODConfig = {
  levels: DEFAULT_LOD_LEVELS,
  algorithm: 'quadric',
  preserveUVSeams: true,
  preserveNormals: true,
  targetErrorThreshold: 0.001,
  generateAtlas: false,
  atlasSize: 2048,
};

// ============================================================================
// MESH ANALYSIS
// ============================================================================

export function analyzeMesh(geometry: THREE.BufferGeometry): MeshAnalysis {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  
  const vertexCount = position.count;
  const triangleCount = index 
    ? index.count / 3 
    : vertexCount / 3;
  
  // Calcular bounding box e sphere
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  
  const boundingBox = geometry.boundingBox || new THREE.Box3();
  const boundingSphere = geometry.boundingSphere || new THREE.Sphere();
  
  // Calcular área de superfície aproximada
  const surfaceArea = calculateSurfaceArea(geometry);
  
  // Calcular volume aproximado
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const volume = size.x * size.y * size.z;
  
  // Determinar complexidade
  let complexity: MeshAnalysis['complexity'] = 'low';
  if (triangleCount > 1000000) complexity = 'ultra';
  else if (triangleCount > 100000) complexity = 'high';
  else if (triangleCount > 10000) complexity = 'medium';
  
  // Contar materiais (groups)
  const materialCount = geometry.groups.length || 1;
  
  return {
    triangleCount,
    vertexCount,
    boundingBox,
    boundingSphere,
    surfaceArea,
    volume,
    complexity,
    materialCount,
    hasUVs: !!geometry.getAttribute('uv'),
    hasNormals: !!geometry.getAttribute('normal'),
    hasTangents: !!geometry.getAttribute('tangent'),
  };
}

function calculateSurfaceArea(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  
  let totalArea = 0;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const cross = new THREE.Vector3();
  
  const getVertex = (i: number, target: THREE.Vector3) => {
    target.fromBufferAttribute(position, i);
  };
  
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      getVertex(index.getX(i), v0);
      getVertex(index.getX(i + 1), v1);
      getVertex(index.getX(i + 2), v2);
      
      edge1.subVectors(v1, v0);
      edge2.subVectors(v2, v0);
      cross.crossVectors(edge1, edge2);
      
      totalArea += cross.length() * 0.5;
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      getVertex(i, v0);
      getVertex(i + 1, v1);
      getVertex(i + 2, v2);
      
      edge1.subVectors(v1, v0);
      edge2.subVectors(v2, v0);
      cross.crossVectors(edge1, edge2);
      
      totalArea += cross.length() * 0.5;
    }
  }
  
  return totalArea;
}

// ============================================================================
// MESH SIMPLIFICATION (Quadric Error Metrics)
// ============================================================================

interface Vertex {
  position: THREE.Vector3;
  quadric: number[][];  // 4x4 matrix
  edges: Set<number>;
  index: number;
  collapsed: boolean;
}

interface Edge {
  v1: number;
  v2: number;
  cost: number;
  optimalPosition: THREE.Vector3;
}

/**
 * Simplifica uma geometria usando Quadric Error Metrics
 */
export function simplifyMeshQuadric(
  geometry: THREE.BufferGeometry,
  targetRatio: number,
  preserveUVSeams: boolean = true
): THREE.BufferGeometry {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  
  if (!index) {
    throw new Error('Geometry must be indexed for simplification');
  }
  
  const vertices: Vertex[] = [];
  const edges: Map<string, Edge> = new Map();
  
  // Inicializar vértices
  for (let i = 0; i < position.count; i++) {
    vertices.push({
      position: new THREE.Vector3().fromBufferAttribute(position, i),
      quadric: createZeroMatrix(),
      edges: new Set(),
      index: i,
      collapsed: false,
    });
  }
  
  // Calcular quadrics iniciais (baseados nos planos das faces)
  for (let i = 0; i < index.count; i += 3) {
    const i0 = index.getX(i);
    const i1 = index.getX(i + 1);
    const i2 = index.getX(i + 2);
    
    const v0 = vertices[i0].position;
    const v1 = vertices[i1].position;
    const v2 = vertices[i2].position;
    
    // Calcular normal da face
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    
    // Coeficientes do plano: ax + by + cz + d = 0
    const a = normal.x;
    const b = normal.y;
    const c = normal.z;
    const d = -normal.dot(v0);
    
    // Matriz fundamental do plano
    const Kp = computePlaneQuadric(a, b, c, d);
    
    // Adicionar aos vértices da face
    addMatrices(vertices[i0].quadric, Kp);
    addMatrices(vertices[i1].quadric, Kp);
    addMatrices(vertices[i2].quadric, Kp);
    
    // Registrar arestas
    registerEdge(edges, vertices, i0, i1);
    registerEdge(edges, vertices, i1, i2);
    registerEdge(edges, vertices, i2, i0);
  }
  
  // Calcular custos iniciais de todas as arestas
  for (const edge of edges.values()) {
    computeEdgeCost(edge, vertices);
  }
  
  // Criar heap de prioridade
  const edgeHeap = Array.from(edges.values()).sort((a, b) => a.cost - b.cost);
  
  // Target triangle count
  const originalTriangles = index.count / 3;
  const targetTriangles = Math.floor(originalTriangles * targetRatio);
  let currentTriangles = originalTriangles;
  
  // Colapsar arestas até atingir o target
  while (currentTriangles > targetTriangles && edgeHeap.length > 0) {
    // Pegar aresta de menor custo
    const edge = edgeHeap.shift()!;
    
    // Verificar se vértices ainda são válidos
    if (vertices[edge.v1].collapsed || vertices[edge.v2].collapsed) {
      continue;
    }
    
    // Colapsar aresta
    const removedTriangles = collapseEdge(edge, vertices, edges, preserveUVSeams);
    currentTriangles -= removedTriangles;
    
    // Recalcular custos das arestas afetadas
    for (const edgeKey of vertices[edge.v1].edges) {
      const affectedEdge = edges.get(edgeKey.toString());
      if (affectedEdge) {
        computeEdgeCost(affectedEdge, vertices);
      }
    }
    
    // Re-ordenar heap
    edgeHeap.sort((a, b) => a.cost - b.cost);
  }
  
  // Reconstruir geometria
  return rebuildGeometry(geometry, vertices, edges);
}

function createZeroMatrix(): number[][] {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
}

function computePlaneQuadric(a: number, b: number, c: number, d: number): number[][] {
  return [
    [a * a, a * b, a * c, a * d],
    [a * b, b * b, b * c, b * d],
    [a * c, b * c, c * c, c * d],
    [a * d, b * d, c * d, d * d],
  ];
}

function addMatrices(target: number[][], source: number[][]): void {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      target[i][j] += source[i][j];
    }
  }
}

function registerEdge(edges: Map<string, Edge>, vertices: Vertex[], v1: number, v2: number): void {
  const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
  if (!edges.has(key)) {
    edges.set(key, {
      v1: Math.min(v1, v2),
      v2: Math.max(v1, v2),
      cost: 0,
      optimalPosition: new THREE.Vector3(),
    });
    vertices[v1].edges.add(v2);
    vertices[v2].edges.add(v1);
  }
}

function computeEdgeCost(edge: Edge, vertices: Vertex[]): void {
  const v1 = vertices[edge.v1];
  const v2 = vertices[edge.v2];
  
  // Somar quadrics
  const Q: number[][] = createZeroMatrix();
  addMatrices(Q, v1.quadric);
  addMatrices(Q, v2.quadric);
  
  // Calcular posição ótima (ponto médio simplificado)
  // Uma implementação completa resolveria o sistema linear Q * v = [0,0,0,1]^T
  edge.optimalPosition.addVectors(v1.position, v2.position).multiplyScalar(0.5);
  
  // Calcular erro (v^T * Q * v)
  const v = edge.optimalPosition;
  const vHomogeneous = [v.x, v.y, v.z, 1];
  
  let cost = 0;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      cost += vHomogeneous[i] * Q[i][j] * vHomogeneous[j];
    }
  }
  
  edge.cost = Math.max(0, cost);
}

function collapseEdge(
  edge: Edge,
  vertices: Vertex[],
  edges: Map<string, Edge>,
  preserveUVSeams: boolean
): number {
  const v1 = vertices[edge.v1];
  const v2 = vertices[edge.v2];
  
  // Marcar v2 como colapsado
  v2.collapsed = true;
  
  // Mover v1 para posição ótima
  v1.position.copy(edge.optimalPosition);
  
  // Mesclar quadrics
  addMatrices(v1.quadric, v2.quadric);
  
  // Transferir arestas de v2 para v1
  let removedTriangles = 0;
  for (const neighborIdx of v2.edges) {
    if (neighborIdx === edge.v1) continue;
    
    const neighbor = vertices[neighborIdx];
    if (neighbor.collapsed) continue;
    
    // Remover aresta antiga v2-neighbor
    const oldKey = edge.v2 < neighborIdx ? `${edge.v2}-${neighborIdx}` : `${neighborIdx}-${edge.v2}`;
    edges.delete(oldKey);
    neighbor.edges.delete(edge.v2);
    
    // Adicionar aresta v1-neighbor se não existir
    const newKey = edge.v1 < neighborIdx ? `${edge.v1}-${neighborIdx}` : `${neighborIdx}-${edge.v1}`;
    if (!edges.has(newKey) && !v1.edges.has(neighborIdx)) {
      registerEdge(edges, vertices, edge.v1, neighborIdx);
    }
    
    removedTriangles++;
  }
  
  // Remover a própria aresta
  const edgeKey = `${edge.v1}-${edge.v2}`;
  edges.delete(edgeKey);
  v1.edges.delete(edge.v2);
  
  return Math.floor(removedTriangles / 2);
}

function rebuildGeometry(
  original: THREE.BufferGeometry,
  vertices: Vertex[],
  edges: Map<string, Edge>
): THREE.BufferGeometry {
  // Mapear índices antigos para novos
  const indexMap = new Map<number, number>();
  const newPositions: number[] = [];
  let newIndex = 0;
  
  for (const vertex of vertices) {
    if (!vertex.collapsed) {
      indexMap.set(vertex.index, newIndex);
      newPositions.push(vertex.position.x, vertex.position.y, vertex.position.z);
      newIndex++;
    }
  }
  
  // Reconstruir índices (simplificado - uma implementação real preservaria faces)
  const originalIndex = original.getIndex()!;
  const newIndices: number[] = [];
  
  for (let i = 0; i < originalIndex.count; i += 3) {
    let i0 = originalIndex.getX(i);
    let i1 = originalIndex.getX(i + 1);
    let i2 = originalIndex.getX(i + 2);
    
    // Resolver vértices colapsados
    while (vertices[i0].collapsed) {
      // Encontrar o vértice para onde foi colapsado
      for (const neighbor of vertices[i0].edges) {
        if (!vertices[neighbor].collapsed) {
          i0 = neighbor;
          break;
        }
      }
    }
    while (vertices[i1].collapsed) {
      for (const neighbor of vertices[i1].edges) {
        if (!vertices[neighbor].collapsed) {
          i1 = neighbor;
          break;
        }
      }
    }
    while (vertices[i2].collapsed) {
      for (const neighbor of vertices[i2].edges) {
        if (!vertices[neighbor].collapsed) {
          i2 = neighbor;
          break;
        }
      }
    }
    
    const ni0 = indexMap.get(i0);
    const ni1 = indexMap.get(i1);
    const ni2 = indexMap.get(i2);
    
    // Apenas adicionar se formar um triângulo válido (não degenerado)
    if (ni0 !== undefined && ni1 !== undefined && ni2 !== undefined &&
        ni0 !== ni1 && ni1 !== ni2 && ni2 !== ni0) {
      newIndices.push(ni0, ni1, ni2);
    }
  }
  
  // Criar nova geometria
  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  newGeometry.setIndex(newIndices);
  newGeometry.computeVertexNormals();
  
  return newGeometry;
}

// ============================================================================
// LOD PIPELINE MANAGER
// ============================================================================

export class AutoLODPipeline {
  private config: LODConfig;
  private queue: AssetLODEntry[] = [];
  private processing = false;
  private onProgress?: (asset: AssetLODEntry, progress: number) => void;
  private onComplete?: (asset: AssetLODEntry, result: LODResult) => void;
  private onError?: (asset: AssetLODEntry, error: Error) => void;

  constructor(config: Partial<LODConfig> = {}) {
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
  }

  /**
   * Adiciona um asset à fila de processamento
   */
  addAsset(assetId: string, assetPath: string, customConfig?: Partial<LODConfig>): void {
    const entry: AssetLODEntry = {
      assetId,
      assetPath,
      config: customConfig ? { ...this.config, ...customConfig } : this.config,
      status: 'pending',
    };
    
    this.queue.push(entry);
    
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Processa um asset imediatamente
   */
  async processAsset(
    geometry: THREE.BufferGeometry,
    config: LODConfig = this.config
  ): Promise<LODResult> {
    const startTime = performance.now();
    
    // Analisar mesh original
    const analysis = analyzeMesh(geometry);
    
    // Gerar LODs
    const lodMeshes = new Map<number, THREE.BufferGeometry>();
    lodMeshes.set(0, geometry.clone()); // LOD 0 = original
    
    for (const level of config.levels) {
      if (level.level === 0) continue;
      
      try {
        let simplifiedGeometry: THREE.BufferGeometry;
        
        if (config.algorithm === 'quadric') {
          simplifiedGeometry = simplifyMeshQuadric(
            geometry,
            level.triangleRatio,
            config.preserveUVSeams
          );
        } else {
          // Fallback para algoritmo mais simples
          simplifiedGeometry = simplifyMeshBasic(geometry, level.triangleRatio);
        }
        
        lodMeshes.set(level.level, simplifiedGeometry);
      } catch (error) {
        console.warn(`Failed to generate LOD ${level.level}:`, error);
        // Usar LOD anterior ou original
        const fallback = lodMeshes.get(level.level - 1) || geometry;
        lodMeshes.set(level.level, fallback.clone());
      }
    }
    
    // Calcular redução de memória
    const originalSize = calculateGeometrySize(geometry);
    let totalLODSize = 0;
    for (const [level, lodGeom] of lodMeshes) {
      if (level > 0) {
        totalLODSize += calculateGeometrySize(lodGeom);
      }
    }
    const avgLODSize = totalLODSize / (lodMeshes.size - 1);
    const memoryReduction = 1 - (avgLODSize / originalSize);
    
    return {
      originalMesh: geometry,
      lodMeshes,
      analysis,
      processingTime: performance.now() - startTime,
      memoryReduction,
    };
  }

  /**
   * Cria um THREE.LOD object pronto para uso
   */
  createLODObject(result: LODResult, material: THREE.Material): THREE.LOD {
    const lod = new THREE.LOD();
    
    for (const level of this.config.levels) {
      const geometry = result.lodMeshes.get(level.level);
      if (geometry) {
        const mesh = new THREE.Mesh(geometry, material);
        lod.addLevel(mesh, level.distance);
      }
    }
    
    return lod;
  }

  /**
   * Event handlers
   */
  on(event: 'progress', handler: (asset: AssetLODEntry, progress: number) => void): this;
  on(event: 'complete', handler: (asset: AssetLODEntry, result: LODResult) => void): this;
  on(event: 'error', handler: (asset: AssetLODEntry, error: Error) => void): this;
  on(
    event: 'progress' | 'complete' | 'error',
    handler: ((asset: AssetLODEntry, progress: number) => void) | 
             ((asset: AssetLODEntry, result: LODResult) => void) |
             ((asset: AssetLODEntry, error: Error) => void)
  ): this {
    if (event === 'progress') this.onProgress = handler as typeof this.onProgress;
    if (event === 'complete') this.onComplete = handler as typeof this.onComplete;
    if (event === 'error') this.onError = handler as typeof this.onError;
    return this;
  }

  /**
   * Processa a fila em background
   */
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const entry = this.queue.find(e => e.status === 'pending');
      if (!entry) break;
      
      entry.status = 'processing';
      
      try {
        // Em uma implementação real, carregaríamos o asset do path
        // Por agora, esperamos que o caller forneça a geometria via processAsset()
        this.onProgress?.(entry, 0);
        
        // Simular processamento
        await new Promise(resolve => setTimeout(resolve, 100));
        
        entry.status = 'completed';
        this.onProgress?.(entry, 100);
      } catch (error) {
        entry.status = 'error';
        entry.error = (error as Error).message;
        this.onError?.(entry, error as Error);
      }
    }
    
    this.processing = false;
  }
}

/**
 * Simplificação básica (vertex decimation) para fallback
 */
function simplifyMeshBasic(
  geometry: THREE.BufferGeometry,
  targetRatio: number
): THREE.BufferGeometry {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  
  if (!index) {
    throw new Error('Geometry must be indexed');
  }
  
  // Grid-based vertex clustering
  const gridSize = Math.pow(targetRatio, 1/3) * 0.1;
  const vertexMap = new Map<string, number>();
  const newPositions: number[] = [];
  const newIndices: number[] = [];
  
  const getGridKey = (x: number, y: number, z: number) => {
    const gx = Math.floor(x / gridSize);
    const gy = Math.floor(y / gridSize);
    const gz = Math.floor(z / gridSize);
    return `${gx},${gy},${gz}`;
  };
  
  // Mapear vértices para células do grid
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = getGridKey(x, y, z);
    
    if (!vertexMap.has(key)) {
      vertexMap.set(key, newPositions.length / 3);
      newPositions.push(x, y, z);
    }
  }
  
  // Reindexar triângulos
  for (let i = 0; i < index.count; i += 3) {
    const indices = [
      index.getX(i),
      index.getX(i + 1),
      index.getX(i + 2),
    ].map(idx => {
      const x = position.getX(idx);
      const y = position.getY(idx);
      const z = position.getZ(idx);
      return vertexMap.get(getGridKey(x, y, z))!;
    });
    
    // Evitar triângulos degenerados
    if (indices[0] !== indices[1] && indices[1] !== indices[2] && indices[2] !== indices[0]) {
      newIndices.push(...indices);
    }
  }
  
  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  newGeometry.setIndex(newIndices);
  newGeometry.computeVertexNormals();
  
  return newGeometry;
}

function calculateGeometrySize(geometry: THREE.BufferGeometry): number {
  let size = 0;
  
  for (const name of Object.keys(geometry.attributes)) {
    const attr = geometry.getAttribute(name);
    size += attr.array.byteLength;
  }
  
  const index = geometry.getIndex();
  if (index) {
    size += index.array.byteLength;
  }
  
  return size;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AutoLODPipeline;
