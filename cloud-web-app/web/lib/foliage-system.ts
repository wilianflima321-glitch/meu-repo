/**
 * Foliage System - Sistema de Vegetação
 * 
 * Sistema profissional de vegetação:
 * - GPU instancing for millions of instances
 * - Procedural placement
 * - Wind animation
 * - LOD management
 * - Grass, trees, bushes
 * - Interactive foliage
 * - Culling optimization
 * - Painting tools
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface FoliageType {
  id: string;
  name: string;
  mesh: THREE.BufferGeometry;
  material: THREE.Material;
  density: number;
  minScale: number;
  maxScale: number;
  minHeight: number;
  maxHeight: number;
  minSlope: number;
  maxSlope: number;
  alignToNormal: boolean;
  randomRotation: boolean;
  windStrength: number;
  lodDistances: number[];
  lodMeshes: THREE.BufferGeometry[];
  castShadow: boolean;
  receiveShadow: boolean;
}

export interface FoliageInstance {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  typeId: string;
}

export interface FoliageCluster {
  id: string;
  typeId: string;
  bounds: THREE.Box3;
  instances: FoliageInstance[];
  instancedMesh: THREE.InstancedMesh | null;
  lodLevel: number;
  visible: boolean;
}

export interface FoliageBrush {
  type: 'paint' | 'erase' | 'scale' | 'rotate';
  size: number;
  density: number;
  falloff: number;
  foliageTypes: string[];
}

export interface FoliageConfig {
  maxInstancesPerCluster: number;
  clusterSize: number;
  lodDistances: number[];
  windSpeed: number;
  windDirection: THREE.Vector2;
  shadowsEnabled: boolean;
}

// ============================================================================
// WIND SHADER
// ============================================================================

const FOLIAGE_VERTEX_SHADER = `
  uniform float uTime;
  uniform vec2 uWindDirection;
  uniform float uWindSpeed;
  uniform float uWindStrength;
  
  attribute vec3 instancePosition;
  attribute vec4 instanceRotation; // quaternion
  attribute vec3 instanceScale;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  // Wind function
  vec3 applyWind(vec3 pos, float strength) {
    float windPhase = uTime * uWindSpeed + dot(instancePosition.xz, uWindDirection) * 0.1;
    
    // Height-based wind effect
    float heightFactor = pos.y / (instanceScale.y * 2.0);
    heightFactor = pow(heightFactor, 2.0);
    
    vec2 windOffset = uWindDirection * sin(windPhase) * strength * heightFactor;
    windOffset += uWindDirection * sin(windPhase * 2.3) * strength * heightFactor * 0.3;
    
    pos.xz += windOffset;
    return pos;
  }
  
  // Apply quaternion rotation
  vec3 applyQuaternion(vec3 v, vec4 q) {
    vec3 qv = vec3(q.x, q.y, q.z);
    vec3 uv = cross(qv, v);
    vec3 uuv = cross(qv, uv);
    return v + 2.0 * (q.w * uv + uuv);
  }
  
  void main() {
    vUv = uv;
    
    // Scale
    vec3 pos = position * instanceScale;
    
    // Apply wind before rotation
    pos = applyWind(pos, uWindStrength);
    
    // Rotate
    pos = applyQuaternion(pos, instanceRotation);
    
    // Translate
    pos += instancePosition;
    
    vWorldPosition = pos;
    vNormal = applyQuaternion(normal, instanceRotation);
    
    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

const FOLIAGE_FRAGMENT_SHADER = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uNormal;
  uniform float uAlphaTest;
  uniform vec3 uSubsurfaceColor;
  uniform float uSubsurfaceStrength;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vec4 diffuse = texture2D(uDiffuse, vUv);
    
    // Alpha test
    if (diffuse.a < uAlphaTest) discard;
    
    // Simple lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    vec3 normal = normalize(vNormal);
    
    float diff = max(dot(normal, lightDir), 0.0);
    float backLight = max(dot(-normal, lightDir), 0.0);
    
    // Subsurface scattering approximation
    vec3 subsurface = uSubsurfaceColor * backLight * uSubsurfaceStrength;
    
    vec3 ambient = vec3(0.3);
    vec3 color = diffuse.rgb * (ambient + diff * 0.7 + subsurface);
    
    gl_FragColor = vec4(color, diffuse.a);
  }
`;

// ============================================================================
// FOLIAGE MATERIAL
// ============================================================================

export class FoliageMaterial extends THREE.ShaderMaterial {
  constructor(diffuseTexture?: THREE.Texture, normalTexture?: THREE.Texture) {
    super({
      uniforms: {
        uDiffuse: { value: diffuseTexture || null },
        uNormal: { value: normalTexture || null },
        uTime: { value: 0 },
        uWindDirection: { value: new THREE.Vector2(1, 0) },
        uWindSpeed: { value: 1.0 },
        uWindStrength: { value: 0.3 },
        uAlphaTest: { value: 0.5 },
        uSubsurfaceColor: { value: new THREE.Color(0x2d5a1e) },
        uSubsurfaceStrength: { value: 0.5 },
      },
      vertexShader: FOLIAGE_VERTEX_SHADER,
      fragmentShader: FOLIAGE_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5,
    });
  }
  
  setWind(direction: THREE.Vector2, speed: number, strength: number): void {
    this.uniforms.uWindDirection.value.copy(direction);
    this.uniforms.uWindSpeed.value = speed;
    this.uniforms.uWindStrength.value = strength;
  }
  
  update(deltaTime: number): void {
    this.uniforms.uTime.value += deltaTime;
  }
}

// ============================================================================
// INSTANCED FOLIAGE MESH
// ============================================================================

export class InstancedFoliageMesh {
  readonly mesh: THREE.InstancedMesh;
  private instanceData: {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    scale: THREE.Vector3;
  }[] = [];
  private maxInstances: number;
  private activeInstances: number = 0;
  
  private positionAttribute: THREE.InstancedBufferAttribute;
  private rotationAttribute: THREE.InstancedBufferAttribute;
  private scaleAttribute: THREE.InstancedBufferAttribute;
  
  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances: number = 10000
  ) {
    this.maxInstances = maxInstances;
    
    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    this.mesh.count = 0;
    
    // Create instance attributes
    const positions = new Float32Array(maxInstances * 3);
    const rotations = new Float32Array(maxInstances * 4);
    const scales = new Float32Array(maxInstances * 3);
    
    this.positionAttribute = new THREE.InstancedBufferAttribute(positions, 3);
    this.rotationAttribute = new THREE.InstancedBufferAttribute(rotations, 4);
    this.scaleAttribute = new THREE.InstancedBufferAttribute(scales, 3);
    
    geometry.setAttribute('instancePosition', this.positionAttribute);
    geometry.setAttribute('instanceRotation', this.rotationAttribute);
    geometry.setAttribute('instanceScale', this.scaleAttribute);
  }
  
  addInstance(
    position: THREE.Vector3,
    rotation: THREE.Quaternion,
    scale: THREE.Vector3
  ): number {
    if (this.activeInstances >= this.maxInstances) {
      console.warn('Max instances reached');
      return -1;
    }
    
    const idx = this.activeInstances;
    
    // Store data
    this.instanceData.push({ position: position.clone(), rotation: rotation.clone(), scale: scale.clone() });
    
    // Update attributes
    this.positionAttribute.setXYZ(idx, position.x, position.y, position.z);
    this.rotationAttribute.setXYZW(idx, rotation.x, rotation.y, rotation.z, rotation.w);
    this.scaleAttribute.setXYZ(idx, scale.x, scale.y, scale.z);
    
    // Update matrix for picking/bounds
    const matrix = new THREE.Matrix4();
    matrix.compose(position, rotation, scale);
    this.mesh.setMatrixAt(idx, matrix);
    
    this.activeInstances++;
    this.mesh.count = this.activeInstances;
    
    this.positionAttribute.needsUpdate = true;
    this.rotationAttribute.needsUpdate = true;
    this.scaleAttribute.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    
    return idx;
  }
  
  removeInstance(index: number): void {
    if (index < 0 || index >= this.activeInstances) return;
    
    // Swap with last instance
    const lastIdx = this.activeInstances - 1;
    if (index !== lastIdx) {
      const last = this.instanceData[lastIdx];
      
      this.positionAttribute.setXYZ(index, last.position.x, last.position.y, last.position.z);
      this.rotationAttribute.setXYZW(index, last.rotation.x, last.rotation.y, last.rotation.z, last.rotation.w);
      this.scaleAttribute.setXYZ(index, last.scale.x, last.scale.y, last.scale.z);
      
      const matrix = new THREE.Matrix4();
      matrix.compose(last.position, last.rotation, last.scale);
      this.mesh.setMatrixAt(index, matrix);
      
      this.instanceData[index] = last;
    }
    
    this.instanceData.pop();
    this.activeInstances--;
    this.mesh.count = this.activeInstances;
    
    this.positionAttribute.needsUpdate = true;
    this.rotationAttribute.needsUpdate = true;
    this.scaleAttribute.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  
  clear(): void {
    this.instanceData = [];
    this.activeInstances = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  
  getInstanceCount(): number {
    return this.activeInstances;
  }
  
  updateBounds(): void {
    this.mesh.computeBoundingBox();
    this.mesh.computeBoundingSphere();
  }
  
  dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }
  }
}

// ============================================================================
// PROCEDURAL PLACEMENT
// ============================================================================

export class FoliagePlacer {
  private noise: {
    sample: (x: number, y: number, scale: number) => number;
  };
  
  constructor(seed: number = 12345) {
    // Simple noise implementation
    this.noise = {
      sample: (x: number, y: number, scale: number) => {
        const nx = x * scale + seed;
        const ny = y * scale + seed * 1.5;
        return (Math.sin(nx) * Math.cos(ny) + 1) * 0.5;
      },
    };
  }
  
  placeFoliage(
    foliageType: FoliageType,
    terrain: { getHeightAt: (x: number, z: number) => number; getNormalAt?: (x: number, z: number) => THREE.Vector3 },
    bounds: THREE.Box3,
    density: number
  ): FoliageInstance[] {
    const instances: FoliageInstance[] = [];
    
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    const area = width * depth;
    const count = Math.floor(area * density * foliageType.density);
    
    for (let i = 0; i < count; i++) {
      // Random position
      const x = bounds.min.x + Math.random() * width;
      const z = bounds.min.z + Math.random() * depth;
      
      // Get terrain height
      const y = terrain.getHeightAt(x, z);
      
      // Check height constraints
      if (y < foliageType.minHeight || y > foliageType.maxHeight) {
        continue;
      }
      
      // Check slope constraints
      if (terrain.getNormalAt) {
        const normal = terrain.getNormalAt(x, z);
        const slope = Math.acos(normal.y) * (180 / Math.PI);
        if (slope < foliageType.minSlope || slope > foliageType.maxSlope) {
          continue;
        }
      }
      
      // Use noise for natural clustering
      const noiseValue = this.noise.sample(x, z, 0.1);
      if (noiseValue < 0.3) continue;
      
      // Generate instance
      const position = new THREE.Vector3(x, y, z);
      
      // Scale
      const scaleValue = THREE.MathUtils.lerp(
        foliageType.minScale,
        foliageType.maxScale,
        Math.random()
      );
      const scale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);
      
      // Rotation
      const rotation = new THREE.Euler();
      if (foliageType.randomRotation) {
        rotation.y = Math.random() * Math.PI * 2;
      }
      if (foliageType.alignToNormal && terrain.getNormalAt) {
        const normal = terrain.getNormalAt(x, z);
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3().crossVectors(up, normal).normalize();
        const angle = Math.acos(up.dot(normal));
        
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        rotation.setFromQuaternion(quaternion);
        rotation.y += Math.random() * Math.PI * 2;
      }
      
      instances.push({
        position,
        rotation,
        scale,
        typeId: foliageType.id,
      });
    }
    
    return instances;
  }
  
  placeInCircle(
    foliageType: FoliageType,
    terrain: { getHeightAt: (x: number, z: number) => number },
    center: THREE.Vector3,
    radius: number,
    density: number
  ): FoliageInstance[] {
    const instances: FoliageInstance[] = [];
    const area = Math.PI * radius * radius;
    const count = Math.floor(area * density * foliageType.density);
    
    for (let i = 0; i < count; i++) {
      // Random point in circle
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius; // Uniform distribution
      
      const x = center.x + Math.cos(angle) * r;
      const z = center.z + Math.sin(angle) * r;
      const y = terrain.getHeightAt(x, z);
      
      // Check height constraints
      if (y < foliageType.minHeight || y > foliageType.maxHeight) {
        continue;
      }
      
      const position = new THREE.Vector3(x, y, z);
      
      const scaleValue = THREE.MathUtils.lerp(
        foliageType.minScale,
        foliageType.maxScale,
        Math.random()
      );
      
      const rotation = new THREE.Euler(
        0,
        foliageType.randomRotation ? Math.random() * Math.PI * 2 : 0,
        0
      );
      
      instances.push({
        position,
        rotation,
        scale: new THREE.Vector3(scaleValue, scaleValue, scaleValue),
        typeId: foliageType.id,
      });
    }
    
    return instances;
  }
}

// ============================================================================
// FOLIAGE CLUSTER
// ============================================================================

export class FoliageClusterManager {
  private clusters: Map<string, FoliageCluster> = new Map();
  private foliageTypes: Map<string, FoliageType> = new Map();
  private instancedMeshes: Map<string, InstancedFoliageMesh> = new Map();
  private scene: THREE.Scene;
  private config: FoliageConfig;
  
  constructor(scene: THREE.Scene, config: Partial<FoliageConfig> = {}) {
    this.scene = scene;
    this.config = {
      maxInstancesPerCluster: 10000,
      clusterSize: 100,
      lodDistances: [50, 100, 200, 400],
      windSpeed: 1,
      windDirection: new THREE.Vector2(1, 0),
      shadowsEnabled: true,
      ...config,
    };
  }
  
  registerFoliageType(type: FoliageType): void {
    this.foliageTypes.set(type.id, type);
    
    // Create instanced mesh for this type
    const instancedMesh = new InstancedFoliageMesh(
      type.mesh,
      type.material,
      this.config.maxInstancesPerCluster
    );
    
    instancedMesh.mesh.castShadow = type.castShadow;
    instancedMesh.mesh.receiveShadow = type.receiveShadow;
    
    this.instancedMeshes.set(type.id, instancedMesh);
    this.scene.add(instancedMesh.mesh);
  }
  
  addInstances(typeId: string, instances: FoliageInstance[]): string {
    const instancedMesh = this.instancedMeshes.get(typeId);
    if (!instancedMesh) {
      throw new Error(`Unknown foliage type: ${typeId}`);
    }
    
    // Create cluster
    const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const bounds = new THREE.Box3();
    const clusterInstances: FoliageInstance[] = [];
    
    for (const instance of instances) {
      const quaternion = new THREE.Quaternion().setFromEuler(instance.rotation);
      const idx = instancedMesh.addInstance(instance.position, quaternion, instance.scale);
      
      if (idx >= 0) {
        bounds.expandByPoint(instance.position);
        clusterInstances.push(instance);
      }
    }
    
    const cluster: FoliageCluster = {
      id: clusterId,
      typeId,
      bounds,
      instances: clusterInstances,
      instancedMesh: instancedMesh.mesh,
      lodLevel: 0,
      visible: true,
    };
    
    this.clusters.set(clusterId, cluster);
    instancedMesh.updateBounds();
    
    return clusterId;
  }
  
  removeCluster(clusterId: string): void {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return;
    
    const instancedMesh = this.instancedMeshes.get(cluster.typeId);
    if (instancedMesh) {
      // Need to track and remove specific instances
      instancedMesh.clear(); // Simplified - in production would track individual instances
    }
    
    this.clusters.delete(clusterId);
  }
  
  update(cameraPosition: THREE.Vector3, deltaTime: number): void {
    // Update wind animation
    for (const instancedMesh of this.instancedMeshes.values()) {
      const material = instancedMesh.mesh.material;
      if (material instanceof FoliageMaterial) {
        material.update(deltaTime);
      }
    }
    
    // Update LODs
    for (const cluster of this.clusters.values()) {
      const center = new THREE.Vector3();
      cluster.bounds.getCenter(center);
      const distance = center.distanceTo(cameraPosition);
      
      // Determine LOD level
      let lod = 0;
      for (let i = this.config.lodDistances.length - 1; i >= 0; i--) {
        if (distance >= this.config.lodDistances[i]) {
          lod = i + 1;
          break;
        }
      }
      
      cluster.lodLevel = lod;
      
      // Culling
      const cullDistance = this.config.lodDistances[this.config.lodDistances.length - 1] * 1.5;
      cluster.visible = distance < cullDistance;
    }
  }
  
  setWind(direction: THREE.Vector2, speed: number): void {
    this.config.windDirection.copy(direction);
    this.config.windSpeed = speed;
    
    for (const instancedMesh of this.instancedMeshes.values()) {
      const material = instancedMesh.mesh.material;
      if (material instanceof FoliageMaterial) {
        const type = Array.from(this.foliageTypes.values()).find(
          t => t.material === material
        );
        const strength = type?.windStrength ?? 0.3;
        material.setWind(direction, speed, strength);
      }
    }
  }
  
  getInstanceCount(): number {
    let total = 0;
    for (const instancedMesh of this.instancedMeshes.values()) {
      total += instancedMesh.getInstanceCount();
    }
    return total;
  }
  
  getClusters(): Map<string, FoliageCluster> {
    return new Map(this.clusters);
  }
  
  dispose(): void {
    for (const instancedMesh of this.instancedMeshes.values()) {
      this.scene.remove(instancedMesh.mesh);
      instancedMesh.dispose();
    }
    
    this.instancedMeshes.clear();
    this.clusters.clear();
    this.foliageTypes.clear();
  }
}

// ============================================================================
// GRASS GENERATOR
// ============================================================================

export class GrassGenerator {
  static createGrassBlade(
    height: number = 0.5,
    width: number = 0.05,
    segments: number = 3
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    const segmentHeight = height / segments;
    
    for (let i = 0; i <= segments; i++) {
      const y = i * segmentHeight;
      const w = width * (1 - i / segments); // Taper toward top
      
      // Left vertex
      vertices.push(-w / 2, y, 0);
      normals.push(0, 0, 1);
      uvs.push(0, i / segments);
      
      // Right vertex
      vertices.push(w / 2, y, 0);
      normals.push(0, 0, 1);
      uvs.push(1, i / segments);
    }
    
    // Create triangles
    for (let i = 0; i < segments; i++) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    return geometry;
  }
  
  static createGrassClump(
    bladeCount: number = 5,
    spread: number = 0.1
  ): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    
    for (let i = 0; i < bladeCount; i++) {
      const blade = this.createGrassBlade(
        0.3 + Math.random() * 0.4,
        0.03 + Math.random() * 0.02
      );
      
      // Random position and rotation
      const matrix = new THREE.Matrix4();
      matrix.makeRotationY(Math.random() * Math.PI * 2);
      matrix.setPosition(
        (Math.random() - 0.5) * spread,
        0,
        (Math.random() - 0.5) * spread
      );
      
      blade.applyMatrix4(matrix);
      geometries.push(blade);
    }
    
    // Merge geometries
    return this.mergeGeometries(geometries);
  }
  
  private static mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const merged = new THREE.BufferGeometry();
    
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    let indexOffset = 0;
    
    for (const geometry of geometries) {
      const pos = geometry.getAttribute('position');
      const norm = geometry.getAttribute('normal');
      const uv = geometry.getAttribute('uv');
      const idx = geometry.getIndex();
      
      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        uvs.push(uv.getX(i), uv.getY(i));
      }
      
      if (idx) {
        for (let i = 0; i < idx.count; i++) {
          indices.push(idx.getX(i) + indexOffset);
        }
      }
      
      indexOffset += pos.count;
    }
    
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    merged.setIndex(indices);
    
    return merged;
  }
}

// ============================================================================
// TREE GENERATOR
// ============================================================================

export class TreeGenerator {
  static createSimpleTree(
    trunkHeight: number = 3,
    trunkRadius: number = 0.2,
    canopyRadius: number = 2,
    canopyHeight: number = 3
  ): THREE.Group {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(
      trunkRadius * 0.7,
      trunkRadius,
      trunkHeight,
      8
    );
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);
    
    // Canopy
    const canopyGeometry = new THREE.ConeGeometry(canopyRadius, canopyHeight, 8);
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a1e,
      roughness: 0.8,
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.y = trunkHeight + canopyHeight / 2;
    canopy.castShadow = true;
    tree.add(canopy);
    
    return tree;
  }
  
  static createPineTree(
    height: number = 8,
    baseRadius: number = 2,
    levels: number = 4
  ): THREE.Group {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkHeight = height * 0.3;
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);
    
    // Foliage levels
    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4a1a,
      roughness: 0.8,
    });
    
    const foliageHeight = height - trunkHeight;
    const levelHeight = foliageHeight / levels;
    
    for (let i = 0; i < levels; i++) {
      const radius = baseRadius * (1 - i / (levels + 1));
      const coneHeight = levelHeight * 1.5;
      
      const coneGeometry = new THREE.ConeGeometry(radius, coneHeight, 8);
      const cone = new THREE.Mesh(coneGeometry, foliageMaterial);
      cone.position.y = trunkHeight + i * levelHeight + coneHeight / 2;
      cone.castShadow = true;
      tree.add(cone);
    }
    
    return tree;
  }
}

// ============================================================================
// FOLIAGE PAINTER
// ============================================================================

export class FoliagePainter {
  private clusterManager: FoliageClusterManager;
  private placer: FoliagePlacer;
  private brush: FoliageBrush;
  private isActive: boolean = false;
  
  constructor(clusterManager: FoliageClusterManager) {
    this.clusterManager = clusterManager;
    this.placer = new FoliagePlacer();
    this.brush = {
      type: 'paint',
      size: 10,
      density: 0.5,
      falloff: 0.5,
      foliageTypes: [],
    };
  }
  
  setBrush(brush: Partial<FoliageBrush>): void {
    Object.assign(this.brush, brush);
  }
  
  getBrush(): FoliageBrush {
    return { ...this.brush };
  }
  
  startPainting(): void {
    this.isActive = true;
  }
  
  stopPainting(): void {
    this.isActive = false;
  }
  
  paint(
    position: THREE.Vector3,
    terrain: { getHeightAt: (x: number, z: number) => number },
    foliageTypes: Map<string, FoliageType>
  ): void {
    if (!this.isActive || this.brush.foliageTypes.length === 0) return;
    
    for (const typeId of this.brush.foliageTypes) {
      const type = foliageTypes.get(typeId);
      if (!type) continue;
      
      const instances = this.placer.placeInCircle(
        type,
        terrain,
        position,
        this.brush.size,
        this.brush.density
      );
      
      if (instances.length > 0) {
        this.clusterManager.addInstances(typeId, instances);
      }
    }
  }
  
  erase(position: THREE.Vector3, radius: number): void {
    // Would need to track individual instances and remove those in range
    // Simplified version - remove entire clusters that overlap
    const clusters = this.clusterManager.getClusters();
    
    for (const [id, cluster] of clusters) {
      const center = new THREE.Vector3();
      cluster.bounds.getCenter(center);
      
      if (center.distanceTo(position) < radius) {
        this.clusterManager.removeCluster(id);
      }
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

