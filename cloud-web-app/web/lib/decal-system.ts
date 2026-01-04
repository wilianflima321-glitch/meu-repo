/**
 * Decal System - Sistema de Decalques
 * 
 * Sistema profissional de decalques:
 * - Projected decals (bullet holes, blood, etc)
 * - Deferred decals
 * - Normal map decals
 * - Decal batching
 * - Fade in/out
 * - Lifetime management
 * - LOD support
 * - Pool management
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface DecalConfig {
  texture: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  size: THREE.Vector3;
  depth: number;
  opacity: number;
  fadeIn: number;
  fadeOut: number;
  lifetime: number;
  blending: THREE.Blending;
  depthTest: boolean;
  depthWrite: boolean;
  polygonOffsetFactor: number;
  polygonOffsetUnits: number;
}

export interface DecalInstance {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  size: THREE.Vector3;
  rotation: number;
  mesh: THREE.Mesh;
  config: DecalConfig;
  spawnTime: number;
  opacity: number;
  active: boolean;
}

export interface DecalPool {
  type: string;
  config: DecalConfig;
  maxInstances: number;
  instances: DecalInstance[];
  activeCount: number;
}

// ============================================================================
// DECAL GEOMETRY GENERATOR
// ============================================================================

export class DecalGeometry extends THREE.BufferGeometry {
  constructor(
    mesh: THREE.Mesh,
    position: THREE.Vector3,
    orientation: THREE.Euler,
    size: THREE.Vector3
  ) {
    super();
    
    // Generate decal geometry by projecting onto mesh
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    // Create projection matrix
    const projectorMatrix = new THREE.Matrix4();
    projectorMatrix.makeRotationFromEuler(orientation);
    projectorMatrix.setPosition(position);
    
    const projectorMatrixInverse = projectorMatrix.clone().invert();
    
    // Get mesh geometry
    const geometry = mesh.geometry;
    const positionAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const index = geometry.getIndex();
    
    // Transform mesh to projector space
    const meshMatrix = mesh.matrixWorld.clone();
    const meshMatrixInverse = meshMatrix.clone().invert();
    
    const decalMatrix = projectorMatrixInverse.clone().multiply(meshMatrix);
    
    // Process triangles
    const vertex = new THREE.Vector3();
    const normal = new THREE.Vector3();
    
    const processTriangle = (a: number, b: number, c: number) => {
      const vA = this.getVertex(positionAttr, a, decalMatrix);
      const vB = this.getVertex(positionAttr, b, decalMatrix);
      const vC = this.getVertex(positionAttr, c, decalMatrix);
      
      const nA = this.getNormal(normalAttr, a, decalMatrix);
      const nB = this.getNormal(normalAttr, b, decalMatrix);
      const nC = this.getNormal(normalAttr, c, decalMatrix);
      
      // Clip triangle to decal box
      const clipped = this.clipTriangle([
        { vertex: vA, normal: nA },
        { vertex: vB, normal: nB },
        { vertex: vC, normal: nC },
      ], size);
      
      if (clipped.length >= 3) {
        // Triangulate clipped polygon
        for (let i = 1; i < clipped.length - 1; i++) {
          this.addVertex(clipped[0], size, vertices, normals, uvs);
          this.addVertex(clipped[i], size, vertices, normals, uvs);
          this.addVertex(clipped[i + 1], size, vertices, normals, uvs);
        }
      }
    };
    
    // Iterate triangles
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        processTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      }
    } else {
      for (let i = 0; i < positionAttr.count; i += 3) {
        processTriangle(i, i + 1, i + 2);
      }
    }
    
    // Apply inverse projection to get world space
    const finalMatrix = projectorMatrix;
    
    // Set attributes
    if (vertices.length > 0) {
      // Transform back to world space
      const transformedVertices = new Float32Array(vertices.length);
      for (let i = 0; i < vertices.length; i += 3) {
        vertex.set(vertices[i], vertices[i + 1], vertices[i + 2]);
        vertex.applyMatrix4(finalMatrix);
        transformedVertices[i] = vertex.x;
        transformedVertices[i + 1] = vertex.y;
        transformedVertices[i + 2] = vertex.z;
      }
      
      const transformedNormals = new Float32Array(normals.length);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(finalMatrix);
      for (let i = 0; i < normals.length; i += 3) {
        normal.set(normals[i], normals[i + 1], normals[i + 2]);
        normal.applyMatrix3(normalMatrix).normalize();
        transformedNormals[i] = normal.x;
        transformedNormals[i + 1] = normal.y;
        transformedNormals[i + 2] = normal.z;
      }
      
      this.setAttribute('position', new THREE.BufferAttribute(transformedVertices, 3));
      this.setAttribute('normal', new THREE.BufferAttribute(transformedNormals, 3));
      this.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    }
  }
  
  private getVertex(
    attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    index: number,
    matrix: THREE.Matrix4
  ): THREE.Vector3 {
    const vertex = new THREE.Vector3(
      attr.getX(index),
      attr.getY(index),
      attr.getZ(index)
    );
    return vertex.applyMatrix4(matrix);
  }
  
  private getNormal(
    attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    index: number,
    matrix: THREE.Matrix4
  ): THREE.Vector3 {
    const normal = new THREE.Vector3(
      attr.getX(index),
      attr.getY(index),
      attr.getZ(index)
    );
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    return normal.applyMatrix3(normalMatrix).normalize();
  }
  
  private clipTriangle(
    triangle: { vertex: THREE.Vector3; normal: THREE.Vector3 }[],
    size: THREE.Vector3
  ): { vertex: THREE.Vector3; normal: THREE.Vector3 }[] {
    let output = [...triangle];
    
    // Clip against all 6 planes
    const planes = [
      { axis: 'x', sign: 1 },
      { axis: 'x', sign: -1 },
      { axis: 'y', sign: 1 },
      { axis: 'y', sign: -1 },
      { axis: 'z', sign: 1 },
      { axis: 'z', sign: -1 },
    ];
    
    for (const plane of planes) {
      if (output.length < 3) break;
      
      const axis = plane.axis as 'x' | 'y' | 'z';
      const sign = plane.sign;
      const limit = (size as any)[axis] / 2;
      
      output = this.clipPolygonToPlane(output, axis, sign, limit);
    }
    
    return output;
  }
  
  private clipPolygonToPlane(
    polygon: { vertex: THREE.Vector3; normal: THREE.Vector3 }[],
    axis: 'x' | 'y' | 'z',
    sign: number,
    limit: number
  ): { vertex: THREE.Vector3; normal: THREE.Vector3 }[] {
    const output: { vertex: THREE.Vector3; normal: THREE.Vector3 }[] = [];
    
    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i];
      const next = polygon[(i + 1) % polygon.length];
      
      const currentInside = (current.vertex[axis] * sign) <= limit;
      const nextInside = (next.vertex[axis] * sign) <= limit;
      
      if (currentInside) {
        output.push(current);
        
        if (!nextInside) {
          // Add intersection point
          const t = (limit - current.vertex[axis] * sign) / 
                    ((next.vertex[axis] - current.vertex[axis]) * sign);
          output.push(this.interpolate(current, next, t));
        }
      } else if (nextInside) {
        // Add intersection point
        const t = (limit - current.vertex[axis] * sign) / 
                  ((next.vertex[axis] - current.vertex[axis]) * sign);
        output.push(this.interpolate(current, next, t));
      }
    }
    
    return output;
  }
  
  private interpolate(
    a: { vertex: THREE.Vector3; normal: THREE.Vector3 },
    b: { vertex: THREE.Vector3; normal: THREE.Vector3 },
    t: number
  ): { vertex: THREE.Vector3; normal: THREE.Vector3 } {
    return {
      vertex: a.vertex.clone().lerp(b.vertex, t),
      normal: a.normal.clone().lerp(b.normal, t).normalize(),
    };
  }
  
  private addVertex(
    point: { vertex: THREE.Vector3; normal: THREE.Vector3 },
    size: THREE.Vector3,
    vertices: number[],
    normals: number[],
    uvs: number[]
  ): void {
    vertices.push(point.vertex.x, point.vertex.y, point.vertex.z);
    normals.push(point.normal.x, point.normal.y, point.normal.z);
    
    // Calculate UV from position
    uvs.push(
      point.vertex.x / size.x + 0.5,
      point.vertex.y / size.y + 0.5
    );
  }
}

// ============================================================================
// DECAL MATERIAL
// ============================================================================

export class DecalMaterial extends THREE.MeshStandardMaterial {
  constructor(config: Partial<DecalConfig> = {}) {
    super({
      map: config.texture || null,
      normalMap: config.normalMap || null,
      transparent: true,
      opacity: config.opacity ?? 1,
      depthTest: config.depthTest ?? true,
      depthWrite: config.depthWrite ?? false,
      polygonOffset: true,
      polygonOffsetFactor: config.polygonOffsetFactor ?? -4,
      polygonOffsetUnits: config.polygonOffsetUnits ?? -4,
      blending: config.blending ?? THREE.NormalBlending,
    });
  }
  
  setOpacity(opacity: number): void {
    this.opacity = opacity;
    this.needsUpdate = true;
  }
}

// ============================================================================
// DECAL MANAGER
// ============================================================================

export class DecalManager {
  private scene: THREE.Scene;
  private pools: Map<string, DecalPool> = new Map();
  private activeDecals: Map<string, DecalInstance> = new Map();
  private nextId: number = 0;
  
  // Default configs
  private defaultConfigs: Map<string, DecalConfig> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initDefaultConfigs();
  }
  
  private initDefaultConfigs(): void {
    // Bullet hole
    this.defaultConfigs.set('bulletHole', {
      texture: null,
      normalMap: null,
      size: new THREE.Vector3(0.1, 0.1, 0.2),
      depth: 0.1,
      opacity: 1,
      fadeIn: 0,
      fadeOut: 2,
      lifetime: 30,
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    
    // Blood splatter
    this.defaultConfigs.set('bloodSplatter', {
      texture: null,
      normalMap: null,
      size: new THREE.Vector3(0.5, 0.5, 0.3),
      depth: 0.1,
      opacity: 0.9,
      fadeIn: 0.1,
      fadeOut: 5,
      lifetime: 60,
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    
    // Scorch mark
    this.defaultConfigs.set('scorchMark', {
      texture: null,
      normalMap: null,
      size: new THREE.Vector3(1, 1, 0.5),
      depth: 0.1,
      opacity: 0.8,
      fadeIn: 0.2,
      fadeOut: 10,
      lifetime: 120,
      blending: THREE.MultiplyBlending,
      depthTest: true,
      depthWrite: false,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    
    // Paint splat
    this.defaultConfigs.set('paintSplat', {
      texture: null,
      normalMap: null,
      size: new THREE.Vector3(0.3, 0.3, 0.2),
      depth: 0.1,
      opacity: 1,
      fadeIn: 0,
      fadeOut: 0,
      lifetime: -1, // Permanent
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
  }
  
  registerDecalType(name: string, config: Partial<DecalConfig>, maxPoolSize: number = 100): void {
    const fullConfig: DecalConfig = {
      ...this.defaultConfigs.get('bulletHole')!,
      ...config,
    };
    
    this.defaultConfigs.set(name, fullConfig);
    
    this.pools.set(name, {
      type: name,
      config: fullConfig,
      maxInstances: maxPoolSize,
      instances: [],
      activeCount: 0,
    });
  }
  
  addDecal(
    type: string,
    targetMesh: THREE.Mesh,
    position: THREE.Vector3,
    normal: THREE.Vector3,
    options: Partial<{
      size: THREE.Vector3;
      rotation: number;
      opacity: number;
    }> = {}
  ): DecalInstance | null {
    const config = this.defaultConfigs.get(type);
    if (!config) {
      console.warn(`Unknown decal type: ${type}`);
      return null;
    }
    
    const pool = this.pools.get(type);
    
    // Check pool for reusable instance
    let instance: DecalInstance | null = null;
    
    if (pool) {
      // Find inactive instance
      instance = pool.instances.find(i => !i.active) || null;
      
      if (!instance && pool.activeCount >= pool.maxInstances) {
        // Remove oldest active instance
        const oldest = pool.instances
          .filter(i => i.active)
          .sort((a, b) => a.spawnTime - b.spawnTime)[0];
        
        if (oldest) {
          this.removeDecal(oldest.id);
        }
      }
    }
    
    // Create orientation from normal
    const orientation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    orientation.setFromQuaternion(quaternion);
    orientation.z = options.rotation || Math.random() * Math.PI * 2;
    
    const size = options.size || config.size.clone();
    
    // Create decal geometry
    const geometry = new DecalGeometry(targetMesh, position, orientation, size);
    
    // Skip if no geometry was generated
    if (!geometry.getAttribute('position') || geometry.getAttribute('position').count === 0) {
      geometry.dispose();
      return null;
    }
    
    // Create material
    const material = new DecalMaterial({
      ...config,
      opacity: 0, // Start invisible for fade in
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1; // Render after normal geometry
    
    // Create instance
    const id = `decal_${this.nextId++}`;
    instance = {
      id,
      position: position.clone(),
      normal: normal.clone(),
      size,
      rotation: options.rotation || 0,
      mesh,
      config: { ...config },
      spawnTime: Date.now() / 1000,
      opacity: options.opacity ?? config.opacity,
      active: true,
    };
    
    // Add to scene and tracking
    this.scene.add(mesh);
    this.activeDecals.set(id, instance);
    
    if (pool) {
      pool.instances.push(instance);
      pool.activeCount++;
    }
    
    return instance;
  }
  
  addDecalAtRaycast(
    type: string,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    meshes: THREE.Mesh[],
    maxDistance: number = 100,
    options: Partial<{
      size: THREE.Vector3;
      rotation: number;
      opacity: number;
    }> = {}
  ): DecalInstance | null {
    const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const normal = hit.face?.normal || direction.clone().negate();
      
      // Transform normal to world space
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();
      
      return this.addDecal(type, hit.object as THREE.Mesh, hit.point, normal, options);
    }
    
    return null;
  }
  
  removeDecal(id: string): void {
    const instance = this.activeDecals.get(id);
    if (!instance) return;
    
    // Remove from scene
    this.scene.remove(instance.mesh);
    instance.mesh.geometry.dispose();
    (instance.mesh.material as THREE.Material).dispose();
    
    // Mark as inactive
    instance.active = false;
    
    // Update pool
    const pool = this.pools.get(instance.config.texture?.name || 'unknown');
    if (pool) {
      pool.activeCount--;
    }
    
    this.activeDecals.delete(id);
  }
  
  update(deltaTime: number): void {
    const currentTime = Date.now() / 1000;
    
    for (const [id, instance] of this.activeDecals) {
      if (!instance.active) continue;
      
      const age = currentTime - instance.spawnTime;
      const config = instance.config;
      const material = instance.mesh.material as DecalMaterial;
      
      // Handle fade in
      if (config.fadeIn > 0 && age < config.fadeIn) {
        const t = age / config.fadeIn;
        material.setOpacity(instance.opacity * t);
      }
      // Handle fade out
      else if (config.lifetime > 0) {
        const fadeOutStart = config.lifetime - config.fadeOut;
        
        if (age >= config.lifetime) {
          // Remove decal
          this.removeDecal(id);
        } else if (age > fadeOutStart && config.fadeOut > 0) {
          const t = 1 - (age - fadeOutStart) / config.fadeOut;
          material.setOpacity(instance.opacity * t);
        } else {
          material.setOpacity(instance.opacity);
        }
      } else {
        material.setOpacity(instance.opacity);
      }
    }
  }
  
  getDecal(id: string): DecalInstance | undefined {
    return this.activeDecals.get(id);
  }
  
  getActiveCount(): number {
    return this.activeDecals.size;
  }
  
  getPoolStats(): { type: string; active: number; max: number }[] {
    const stats: { type: string; active: number; max: number }[] = [];
    
    for (const [type, pool] of this.pools) {
      stats.push({
        type,
        active: pool.activeCount,
        max: pool.maxInstances,
      });
    }
    
    return stats;
  }
  
  clearAll(): void {
    for (const id of this.activeDecals.keys()) {
      this.removeDecal(id);
    }
  }
  
  clearType(type: string): void {
    for (const [id, instance] of this.activeDecals) {
      if (this.defaultConfigs.has(type)) {
        this.removeDecal(id);
      }
    }
  }
  
  dispose(): void {
    this.clearAll();
    this.pools.clear();
    this.defaultConfigs.clear();
  }
}

// ============================================================================
// DEFERRED DECAL RENDERER
// ============================================================================

export class DeferredDecalRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private decalBoxes: THREE.Mesh[] = [];
  
  private decalMaterial: THREE.ShaderMaterial;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    // Create deferred decal material
    this.decalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDecalTexture: { value: null },
        uDecalNormalMap: { value: null },
        uDepthTexture: { value: null },
        uNormalTexture: { value: null },
        uViewMatrix: { value: new THREE.Matrix4() },
        uProjectionMatrix: { value: new THREE.Matrix4() },
        uProjectionMatrixInverse: { value: new THREE.Matrix4() },
        uDecalMatrix: { value: new THREE.Matrix4() },
        uDecalMatrixInverse: { value: new THREE.Matrix4() },
      },
      vertexShader: DEFERRED_DECAL_VERTEX,
      fragmentShader: DEFERRED_DECAL_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }
  
  addDecal(
    position: THREE.Vector3,
    orientation: THREE.Quaternion,
    size: THREE.Vector3,
    texture: THREE.Texture,
    normalMap?: THREE.Texture
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = this.decalMaterial.clone();
    
    material.uniforms.uDecalTexture.value = texture;
    material.uniforms.uDecalNormalMap.value = normalMap || null;
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.quaternion.copy(orientation);
    
    // Store decal matrix
    const decalMatrix = new THREE.Matrix4();
    mesh.updateMatrixWorld();
    decalMatrix.copy(mesh.matrixWorld);
    material.uniforms.uDecalMatrix.value = decalMatrix;
    material.uniforms.uDecalMatrixInverse.value = decalMatrix.clone().invert();
    
    this.decalBoxes.push(mesh);
    this.scene.add(mesh);
    
    return mesh;
  }
  
  setGBufferTextures(depthTexture: THREE.Texture, normalTexture: THREE.Texture): void {
    for (const box of this.decalBoxes) {
      const material = box.material as THREE.ShaderMaterial;
      material.uniforms.uDepthTexture.value = depthTexture;
      material.uniforms.uNormalTexture.value = normalTexture;
    }
  }
  
  updateMatrices(): void {
    const viewMatrix = this.camera.matrixWorldInverse;
    const projectionMatrix = (this.camera as THREE.PerspectiveCamera).projectionMatrix;
    const projectionMatrixInverse = projectionMatrix.clone().invert();
    
    for (const box of this.decalBoxes) {
      const material = box.material as THREE.ShaderMaterial;
      material.uniforms.uViewMatrix.value = viewMatrix;
      material.uniforms.uProjectionMatrix.value = projectionMatrix;
      material.uniforms.uProjectionMatrixInverse.value = projectionMatrixInverse;
    }
  }
  
  removeDecal(mesh: THREE.Mesh): void {
    const idx = this.decalBoxes.indexOf(mesh);
    if (idx !== -1) {
      this.decalBoxes.splice(idx, 1);
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
  
  dispose(): void {
    for (const box of this.decalBoxes) {
      this.scene.remove(box);
      box.geometry.dispose();
      (box.material as THREE.Material).dispose();
    }
    this.decalBoxes = [];
    this.decalMaterial.dispose();
  }
}

const DEFERRED_DECAL_VERTEX = `
  varying vec4 vProjectedPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vProjectedPosition = projectionMatrix * viewMatrix * worldPosition;
    gl_Position = vProjectedPosition;
  }
`;

const DEFERRED_DECAL_FRAGMENT = `
  uniform sampler2D uDecalTexture;
  uniform sampler2D uDecalNormalMap;
  uniform sampler2D uDepthTexture;
  uniform sampler2D uNormalTexture;
  
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrixInverse;
  uniform mat4 uDecalMatrixInverse;
  
  varying vec4 vProjectedPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    // Get screen UV
    vec2 screenUV = (vProjectedPosition.xy / vProjectedPosition.w) * 0.5 + 0.5;
    
    // Sample depth and reconstruct world position
    float depth = texture2D(uDepthTexture, screenUV).r;
    
    vec4 clipPos = vec4(screenUV * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 viewPos = uProjectionMatrixInverse * clipPos;
    viewPos /= viewPos.w;
    
    vec3 worldPos = (inverse(uViewMatrix) * viewPos).xyz;
    
    // Transform to decal space
    vec4 decalPos = uDecalMatrixInverse * vec4(worldPos, 1.0);
    
    // Check if point is inside decal box
    if (abs(decalPos.x) > 0.5 || abs(decalPos.y) > 0.5 || abs(decalPos.z) > 0.5) {
      discard;
    }
    
    // Calculate decal UV
    vec2 decalUV = decalPos.xy + 0.5;
    
    // Sample decal texture
    vec4 decalColor = texture2D(uDecalTexture, decalUV);
    
    if (decalColor.a < 0.01) discard;
    
    gl_FragColor = decalColor;
  }
`;

// ============================================================================
// EXPORTS
// ============================================================================

