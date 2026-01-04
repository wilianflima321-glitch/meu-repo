/**
 * Destruction System (Chaos-like)
 * 
 * Sistema de destruição física profissional:
 * - Mesh fracturing/voronoi decomposition
 * - Real-time destruction
 * - Debris physics
 * - Destruction levels (hierarchical)
 * - Damage thresholds
 * - Impact propagation
 * - Sound/VFX triggers
 * - Debris cleanup/pooling
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface DestructibleConfig {
  maxHealth: number;
  fractureLevels: number;
  fragmentCount: number;
  debrisLifetime: number;
  impactPropagation: number;
  enablePhysics: boolean;
  enableSound: boolean;
  enableVFX: boolean;
}

export interface FragmentData {
  id: string;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  mass: number;
  lifetime: number;
  spawnTime: number;
  active: boolean;
}

export interface DestructionEvent {
  type: 'damage' | 'fracture' | 'destroy' | 'cleanup';
  targetId: string;
  damage: number;
  impactPoint: THREE.Vector3;
  impactNormal: THREE.Vector3;
  impactForce: number;
  fragments?: string[];
}

export interface VoronoiCell {
  center: THREE.Vector3;
  vertices: THREE.Vector3[];
  faces: number[][];
}

// ============================================================================
// VORONOI FRACTURE GENERATOR
// ============================================================================

export class VoronoiFractureGenerator {
  private seed: number;
  
  constructor(seed: number = 12345) {
    this.seed = seed;
  }
  
  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  
  generatePoints(bounds: THREE.Box3, count: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const size = new THREE.Vector3();
    bounds.getSize(size);
    
    for (let i = 0; i < count; i++) {
      points.push(new THREE.Vector3(
        bounds.min.x + this.random() * size.x,
        bounds.min.y + this.random() * size.y,
        bounds.min.z + this.random() * size.z
      ));
    }
    
    return points;
  }
  
  generateCells(points: THREE.Vector3[], bounds: THREE.Box3): VoronoiCell[] {
    const cells: VoronoiCell[] = [];
    
    // Simplified Voronoi using closest-point partitioning
    // Real implementation would use Fortune's algorithm or similar
    
    const gridSize = 10;
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const step = size.clone().divideScalar(gridSize);
    
    // Assign grid points to nearest Voronoi center
    const assignments: Map<number, THREE.Vector3[]> = new Map();
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          const point = new THREE.Vector3(
            bounds.min.x + (x + 0.5) * step.x,
            bounds.min.y + (y + 0.5) * step.y,
            bounds.min.z + (z + 0.5) * step.z
          );
          
          let nearestIdx = 0;
          let nearestDist = Infinity;
          
          for (let i = 0; i < points.length; i++) {
            const dist = point.distanceToSquared(points[i]);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestIdx = i;
            }
          }
          
          if (!assignments.has(nearestIdx)) {
            assignments.set(nearestIdx, []);
          }
          assignments.get(nearestIdx)!.push(point);
        }
      }
    }
    
    // Create cells from assignments
    for (let i = 0; i < points.length; i++) {
      const cellPoints = assignments.get(i) || [];
      if (cellPoints.length === 0) continue;
      
      cells.push({
        center: points[i],
        vertices: cellPoints,
        faces: [], // Would compute from convex hull
      });
    }
    
    return cells;
  }
  
  cellToGeometry(cell: VoronoiCell): THREE.BufferGeometry {
    if (cell.vertices.length < 4) {
      // Create small box as fallback
      return new THREE.BoxGeometry(1, 1, 1);
    }
    
    // Create convex hull from vertices
    const geometry = new THREE.BufferGeometry();
    
    // Compute centroid
    const centroid = new THREE.Vector3();
    for (const v of cell.vertices) {
      centroid.add(v);
    }
    centroid.divideScalar(cell.vertices.length);
    
    // Create tetrahedra from centroid to each face
    // Simplified: create triangulated surface
    const positions: number[] = [];
    const normals: number[] = [];
    
    // Sort vertices by angle around centroid
    const sorted = [...cell.vertices].sort((a, b) => {
      const angleA = Math.atan2(a.z - centroid.z, a.x - centroid.x);
      const angleB = Math.atan2(b.z - centroid.z, b.x - centroid.x);
      return angleA - angleB;
    });
    
    // Create fan triangulation
    for (let i = 1; i < sorted.length - 1; i++) {
      const v0 = centroid;
      const v1 = sorted[i];
      const v2 = sorted[i + 1];
      
      positions.push(v0.x, v0.y, v0.z);
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);
      
      // Compute normal
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      
      for (let j = 0; j < 3; j++) {
        normals.push(normal.x, normal.y, normal.z);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.computeBoundingBox();
    
    return geometry;
  }
}

// ============================================================================
// DESTRUCTIBLE OBJECT
// ============================================================================

export class DestructibleObject {
  readonly id: string;
  readonly config: DestructibleConfig;
  
  private mesh: THREE.Mesh;
  private originalGeometry: THREE.BufferGeometry;
  private originalMaterial: THREE.Material;
  private health: number;
  private currentLevel: number = 0;
  private destroyed: boolean = false;
  private fragments: FragmentData[] = [];
  
  private fractureGenerator: VoronoiFractureGenerator;
  private scene: THREE.Scene;
  
  constructor(
    id: string,
    mesh: THREE.Mesh,
    scene: THREE.Scene,
    config: Partial<DestructibleConfig> = {}
  ) {
    this.id = id;
    this.mesh = mesh;
    this.scene = scene;
    this.originalGeometry = mesh.geometry.clone();
    this.originalMaterial = mesh.material as THREE.Material;
    
    this.config = {
      maxHealth: 100,
      fractureLevels: 3,
      fragmentCount: 8,
      debrisLifetime: 5,
      impactPropagation: 2.0,
      enablePhysics: true,
      enableSound: true,
      enableVFX: true,
      ...config,
    };
    
    this.health = this.config.maxHealth;
    this.fractureGenerator = new VoronoiFractureGenerator(Math.random() * 99999);
  }
  
  applyDamage(
    damage: number,
    impactPoint: THREE.Vector3,
    impactNormal: THREE.Vector3,
    impactForce: number
  ): DestructionEvent {
    if (this.destroyed) {
      return {
        type: 'damage',
        targetId: this.id,
        damage: 0,
        impactPoint,
        impactNormal,
        impactForce,
      };
    }
    
    this.health -= damage;
    
    // Calculate damage threshold for current level
    const healthPerLevel = this.config.maxHealth / this.config.fractureLevels;
    const targetLevel = Math.floor((this.config.maxHealth - this.health) / healthPerLevel);
    
    if (targetLevel > this.currentLevel && targetLevel < this.config.fractureLevels) {
      // Partial fracture
      this.fracture(impactPoint, impactForce, false);
      this.currentLevel = targetLevel;
      
      return {
        type: 'fracture',
        targetId: this.id,
        damage,
        impactPoint,
        impactNormal,
        impactForce,
        fragments: this.fragments.map(f => f.id),
      };
    }
    
    if (this.health <= 0) {
      // Complete destruction
      this.destroy(impactPoint, impactForce);
      
      return {
        type: 'destroy',
        targetId: this.id,
        damage,
        impactPoint,
        impactNormal,
        impactForce,
        fragments: this.fragments.map(f => f.id),
      };
    }
    
    return {
      type: 'damage',
      targetId: this.id,
      damage,
      impactPoint,
      impactNormal,
      impactForce,
    };
  }
  
  private fracture(impactPoint: THREE.Vector3, impactForce: number, complete: boolean): void {
    // Get bounding box
    this.mesh.geometry.computeBoundingBox();
    const bounds = this.mesh.geometry.boundingBox!.clone();
    
    // Transform bounds to world space
    bounds.applyMatrix4(this.mesh.matrixWorld);
    
    // Generate Voronoi points (biased toward impact)
    const fragmentCount = complete 
      ? this.config.fragmentCount 
      : Math.ceil(this.config.fragmentCount / 2);
    
    const points = this.generateBiasedPoints(bounds, impactPoint, fragmentCount);
    const cells = this.fractureGenerator.generateCells(points, bounds);
    
    // Create fragment meshes
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const fragmentGeometry = this.fractureGenerator.cellToGeometry(cell);
      
      // Center geometry
      fragmentGeometry.computeBoundingBox();
      const center = new THREE.Vector3();
      fragmentGeometry.boundingBox!.getCenter(center);
      fragmentGeometry.translate(-center.x, -center.y, -center.z);
      
      const fragmentMaterial = this.originalMaterial.clone();
      const fragmentMesh = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
      
      fragmentMesh.position.copy(center);
      fragmentMesh.castShadow = this.mesh.castShadow;
      fragmentMesh.receiveShadow = this.mesh.receiveShadow;
      
      // Calculate velocity based on impact
      const toFragment = center.clone().sub(impactPoint).normalize();
      const velocityMagnitude = impactForce * (0.5 + Math.random() * 0.5);
      
      const fragment: FragmentData = {
        id: `${this.id}_frag_${i}`,
        mesh: fragmentMesh,
        velocity: toFragment.multiplyScalar(velocityMagnitude),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        mass: 1,
        lifetime: this.config.debrisLifetime,
        spawnTime: Date.now() / 1000,
        active: true,
      };
      
      this.fragments.push(fragment);
      this.scene.add(fragmentMesh);
    }
    
    if (complete) {
      // Hide original mesh
      this.mesh.visible = false;
    }
  }
  
  private generateBiasedPoints(
    bounds: THREE.Box3,
    impactPoint: THREE.Vector3,
    count: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const size = new THREE.Vector3();
    bounds.getSize(size);
    
    // Add impact point
    points.push(impactPoint.clone());
    
    // Add random points biased toward impact
    for (let i = 1; i < count; i++) {
      const bias = Math.random() < 0.6 ? 0.3 : 1.0; // 60% near impact
      const point = new THREE.Vector3(
        bounds.min.x + Math.random() * size.x,
        bounds.min.y + Math.random() * size.y,
        bounds.min.z + Math.random() * size.z
      );
      
      // Bias toward impact
      point.lerp(impactPoint, 1 - bias);
      points.push(point);
    }
    
    return points;
  }
  
  private destroy(impactPoint: THREE.Vector3, impactForce: number): void {
    this.destroyed = true;
    this.fracture(impactPoint, impactForce, true);
    
    // Trigger VFX
    if (this.config.enableVFX) {
      this.spawnDestructionVFX(impactPoint);
    }
  }
  
  private spawnDestructionVFX(position: THREE.Vector3): void {
    // Create dust particles
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      
      velocities[i * 3] = (Math.random() - 0.5) * 5;
      velocities[i * 3 + 1] = Math.random() * 3;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x888888,
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    // Store for animation (in real implementation)
    // This would be handled by the particle system
    setTimeout(() => {
      this.scene.remove(particles);
      geometry.dispose();
      material.dispose();
    }, 2000);
  }
  
  update(deltaTime: number): void {
    const gravity = new THREE.Vector3(0, -9.81, 0);
    const currentTime = Date.now() / 1000;
    
    for (const fragment of this.fragments) {
      if (!fragment.active) continue;
      
      // Check lifetime
      const age = currentTime - fragment.spawnTime;
      if (age > fragment.lifetime) {
        this.deactivateFragment(fragment);
        continue;
      }
      
      // Apply physics
      if (this.config.enablePhysics) {
        // Apply gravity
        fragment.velocity.addScaledVector(gravity, deltaTime);
        
        // Apply drag
        fragment.velocity.multiplyScalar(0.99);
        fragment.angularVelocity.multiplyScalar(0.98);
        
        // Update position
        fragment.mesh.position.addScaledVector(fragment.velocity, deltaTime);
        
        // Update rotation
        fragment.mesh.rotation.x += fragment.angularVelocity.x * deltaTime;
        fragment.mesh.rotation.y += fragment.angularVelocity.y * deltaTime;
        fragment.mesh.rotation.z += fragment.angularVelocity.z * deltaTime;
        
        // Simple ground collision
        if (fragment.mesh.position.y < 0) {
          fragment.mesh.position.y = 0;
          fragment.velocity.y *= -0.3; // Bounce with energy loss
          fragment.velocity.x *= 0.7;
          fragment.velocity.z *= 0.7;
          fragment.angularVelocity.multiplyScalar(0.5);
        }
      }
      
      // Fade out near end of lifetime
      const fadeStart = fragment.lifetime * 0.7;
      if (age > fadeStart) {
        const fadeProgress = (age - fadeStart) / (fragment.lifetime - fadeStart);
        const material = fragment.mesh.material as THREE.MeshStandardMaterial;
        if (material.transparent !== true) {
          material.transparent = true;
        }
        material.opacity = 1 - fadeProgress;
      }
    }
  }
  
  private deactivateFragment(fragment: FragmentData): void {
    fragment.active = false;
    this.scene.remove(fragment.mesh);
    fragment.mesh.geometry.dispose();
    (fragment.mesh.material as THREE.Material).dispose();
  }
  
  cleanup(): void {
    for (const fragment of this.fragments) {
      if (fragment.active) {
        this.deactivateFragment(fragment);
      }
    }
    this.fragments = [];
  }
  
  reset(): void {
    this.cleanup();
    this.health = this.config.maxHealth;
    this.currentLevel = 0;
    this.destroyed = false;
    this.mesh.visible = true;
  }
  
  isDestroyed(): boolean {
    return this.destroyed;
  }
  
  getHealth(): number {
    return this.health;
  }
  
  getHealthPercentage(): number {
    return this.health / this.config.maxHealth;
  }
  
  getMesh(): THREE.Mesh {
    return this.mesh;
  }
  
  getActiveFragmentCount(): number {
    return this.fragments.filter(f => f.active).length;
  }
}

// ============================================================================
// DESTRUCTION MANAGER
// ============================================================================

export class DestructionManager {
  private destructibles: Map<string, DestructibleObject> = new Map();
  private scene: THREE.Scene;
  private eventListeners: ((event: DestructionEvent) => void)[] = [];
  
  // Object pooling for debris
  private debrisPool: THREE.Mesh[] = [];
  private maxPoolSize: number = 100;
  
  // Statistics
  private stats = {
    totalDestructions: 0,
    activeFragments: 0,
    pooledDebris: 0,
  };
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  register(
    id: string,
    mesh: THREE.Mesh,
    config?: Partial<DestructibleConfig>
  ): DestructibleObject {
    const destructible = new DestructibleObject(id, mesh, this.scene, config);
    this.destructibles.set(id, destructible);
    return destructible;
  }
  
  unregister(id: string): void {
    const destructible = this.destructibles.get(id);
    if (destructible) {
      destructible.cleanup();
      this.destructibles.delete(id);
    }
  }
  
  applyDamage(
    targetId: string,
    damage: number,
    impactPoint: THREE.Vector3,
    impactNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    impactForce: number = 10
  ): DestructionEvent | null {
    const destructible = this.destructibles.get(targetId);
    if (!destructible) return null;
    
    const event = destructible.applyDamage(damage, impactPoint, impactNormal, impactForce);
    
    if (event.type === 'destroy') {
      this.stats.totalDestructions++;
    }
    
    // Notify listeners
    for (const listener of this.eventListeners) {
      listener(event);
    }
    
    // Propagate damage to nearby objects
    if (event.type !== 'damage' && destructible.config.impactPropagation > 0) {
      this.propagateDamage(impactPoint, damage * 0.5, destructible.config.impactPropagation, targetId);
    }
    
    return event;
  }
  
  private propagateDamage(
    center: THREE.Vector3,
    damage: number,
    radius: number,
    excludeId: string
  ): void {
    for (const [id, destructible] of this.destructibles) {
      if (id === excludeId || destructible.isDestroyed()) continue;
      
      const position = destructible.getMesh().position;
      const distance = position.distanceTo(center);
      
      if (distance < radius) {
        const falloff = 1 - (distance / radius);
        const propagatedDamage = damage * falloff;
        
        if (propagatedDamage > 1) {
          const direction = position.clone().sub(center).normalize();
          destructible.applyDamage(
            propagatedDamage,
            position.clone().sub(direction.multiplyScalar(0.1)),
            direction.negate(),
            propagatedDamage * 0.5
          );
        }
      }
    }
  }
  
  applyExplosion(
    center: THREE.Vector3,
    damage: number,
    radius: number
  ): DestructionEvent[] {
    const events: DestructionEvent[] = [];
    
    for (const [id, destructible] of this.destructibles) {
      if (destructible.isDestroyed()) continue;
      
      const position = destructible.getMesh().position;
      const distance = position.distanceTo(center);
      
      if (distance < radius) {
        const falloff = 1 - (distance / radius);
        const explosionDamage = damage * falloff;
        const direction = position.clone().sub(center).normalize();
        
        const event = destructible.applyDamage(
          explosionDamage,
          position.clone().sub(direction.multiplyScalar(0.5)),
          direction.negate(),
          explosionDamage
        );
        
        events.push(event);
      }
    }
    
    return events;
  }
  
  raycastDamage(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    damage: number,
    maxDistance: number = 100
  ): DestructionEvent | null {
    const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
    
    const meshes = Array.from(this.destructibles.values())
      .filter(d => !d.isDestroyed())
      .map(d => d.getMesh());
    
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      
      // Find destructible by mesh
      for (const [id, destructible] of this.destructibles) {
        if (destructible.getMesh() === mesh) {
          return this.applyDamage(
            id,
            damage,
            hit.point,
            hit.face?.normal || direction.clone().negate(),
            damage * 0.5
          );
        }
      }
    }
    
    return null;
  }
  
  update(deltaTime: number): void {
    let activeFragments = 0;
    
    for (const destructible of this.destructibles.values()) {
      destructible.update(deltaTime);
      activeFragments += destructible.getActiveFragmentCount();
    }
    
    this.stats.activeFragments = activeFragments;
    this.stats.pooledDebris = this.debrisPool.length;
  }
  
  onDestruction(callback: (event: DestructionEvent) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index !== -1) this.eventListeners.splice(index, 1);
    };
  }
  
  // Pool management
  getDebrisFromPool(): THREE.Mesh | null {
    return this.debrisPool.pop() || null;
  }
  
  returnDebrisToPool(mesh: THREE.Mesh): void {
    if (this.debrisPool.length < this.maxPoolSize) {
      mesh.visible = false;
      this.debrisPool.push(mesh);
    } else {
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose();
    }
  }
  
  getDestructible(id: string): DestructibleObject | undefined {
    return this.destructibles.get(id);
  }
  
  getAllDestructibles(): Map<string, DestructibleObject> {
    return new Map(this.destructibles);
  }
  
  getStats(): typeof this.stats {
    return { ...this.stats };
  }
  
  cleanupAll(): void {
    for (const destructible of this.destructibles.values()) {
      destructible.cleanup();
    }
  }
  
  resetAll(): void {
    for (const destructible of this.destructibles.values()) {
      destructible.reset();
    }
    this.stats.totalDestructions = 0;
  }
  
  dispose(): void {
    this.cleanupAll();
    this.destructibles.clear();
    
    // Dispose pool
    for (const mesh of this.debrisPool) {
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose();
    }
    this.debrisPool = [];
  }
}

// ============================================================================
// PRE-FRACTURED MESH GENERATOR
// ============================================================================

export class PreFracturedMesh {
  private levels: THREE.Group[] = [];
  private currentLevel: number = 0;
  private bounds: THREE.Box3;
  
  constructor(
    originalGeometry: THREE.BufferGeometry,
    originalMaterial: THREE.Material,
    fractureCount: number = 8,
    levels: number = 3
  ) {
    originalGeometry.computeBoundingBox();
    this.bounds = originalGeometry.boundingBox!.clone();
    
    const generator = new VoronoiFractureGenerator();
    
    for (let level = 0; level < levels; level++) {
      const group = new THREE.Group();
      const count = fractureCount * Math.pow(2, level);
      const points = generator.generatePoints(this.bounds, count);
      const cells = generator.generateCells(points, this.bounds);
      
      for (const cell of cells) {
        const geometry = generator.cellToGeometry(cell);
        const material = originalMaterial.clone();
        const mesh = new THREE.Mesh(geometry, material);
        
        // Center
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox!.getCenter(center);
        mesh.position.copy(center);
        
        group.add(mesh);
      }
      
      group.visible = level === 0;
      this.levels.push(group);
    }
  }
  
  setLevel(level: number): void {
    if (level >= 0 && level < this.levels.length) {
      for (let i = 0; i < this.levels.length; i++) {
        this.levels[i].visible = i === level;
      }
      this.currentLevel = level;
    }
  }
  
  getLevel(level: number): THREE.Group | undefined {
    return this.levels[level];
  }
  
  getAllLevels(): THREE.Group[] {
    return [...this.levels];
  }
  
  getCurrentLevel(): number {
    return this.currentLevel;
  }
  
  addToScene(scene: THREE.Scene): void {
    for (const level of this.levels) {
      scene.add(level);
    }
  }
  
  removeFromScene(scene: THREE.Scene): void {
    for (const level of this.levels) {
      scene.remove(level);
    }
  }
  
  dispose(): void {
    for (const level of this.levels) {
      level.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          (obj.material as THREE.Material)?.dispose();
        }
      });
    }
    this.levels = [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Singleton manager
let destructionManagerInstance: DestructionManager | null = null;

export function getDestructionManager(scene?: THREE.Scene): DestructionManager {
  if (!destructionManagerInstance && scene) {
    destructionManagerInstance = new DestructionManager(scene);
  }
  if (!destructionManagerInstance) {
    throw new Error('DestructionManager not initialized. Provide a scene.');
  }
  return destructionManagerInstance;
}

export function createDestructionManager(scene: THREE.Scene): DestructionManager {
  destructionManagerInstance = new DestructionManager(scene);
  return destructionManagerInstance;
}
