/**
 * @aethel-heavy-async-boundary
 * Terrain System
 *
 * Governed procedural terrain runtime for height maps, mesh updates,
 * sculpting, foliage painting, and LOD surfaces.
 *
 * @module lib/terrain/terrain-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';
import type {
  BrushSettings,
  FoliageInstance,
  FoliageType,
  NoiseSettings,
  TerrainLayer,
  TerrainSettings,
} from './terrain-contracts';
import { HeightMap, PerlinNoise } from './terrain-heightmap';

export { HeightMap, PerlinNoise } from './terrain-heightmap';
export type {
  BrushSettings,
  FoliageInstance,
  FoliageType,
  NoiseSettings,
  TerrainLayer,
  TerrainSettings,
} from './terrain-contracts';


// ============================================================================
// TERRAIN MESH
// ============================================================================

export class TerrainMesh extends THREE.Mesh {
  private heightMap: HeightMap;
  private settings: TerrainSettings;
  private terrainLayers: TerrainLayer[] = [];

  constructor(settings: TerrainSettings, heightMap?: HeightMap) {
    const geometry = new THREE.PlaneGeometry(
      settings.width,
      settings.depth,
      settings.resolution - 1,
      settings.resolution - 1
    );
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x556B2F,
      wireframe: false,
      flatShading: false,
    });

    super(geometry, material);

    this.settings = settings;
    this.heightMap = heightMap || new HeightMap(settings.resolution, settings.resolution);

    this.updateGeometryFromHeightMap();
  }

  updateGeometryFromHeightMap(): void {
    const positions = this.geometry.attributes.position;
    const normals = this.geometry.attributes.normal;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Convert world coords to heightmap coords
      const hx = ((x / this.settings.width) + 0.5) * (this.heightMap.width - 1);
      const hz = ((z / this.settings.depth) + 0.5) * (this.heightMap.height - 1);

      const height = this.heightMap.getInterpolated(hx, hz) * this.settings.maxHeight;
      positions.setY(i, height);
    }

    this.geometry.computeVertexNormals();
    positions.needsUpdate = true;
    normals.needsUpdate = true;

    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }

  getHeightAt(x: number, z: number): number {
    const hx = ((x / this.settings.width) + 0.5) * (this.heightMap.width - 1);
    const hz = ((z / this.settings.depth) + 0.5) * (this.heightMap.height - 1);
    return this.heightMap.getInterpolated(hx, hz) * this.settings.maxHeight;
  }

  getNormalAt(x: number, z: number): THREE.Vector3 {
    const hx = ((x / this.settings.width) + 0.5) * (this.heightMap.width - 1);
    const hz = ((z / this.settings.depth) + 0.5) * (this.heightMap.height - 1);
    return this.heightMap.getNormal(Math.floor(hx), Math.floor(hz), this.settings.maxHeight);
  }

  sculpt(
    worldX: number,
    worldZ: number,
    brush: BrushSettings,
    operation: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise'
  ): void {
    // Convert world coords to heightmap coords
    const hx = ((worldX / this.settings.width) + 0.5) * (this.heightMap.width - 1);
    const hz = ((worldZ / this.settings.depth) + 0.5) * (this.heightMap.height - 1);

    // Scale brush size to heightmap coords
    const scaledBrush = {
      ...brush,
      size: brush.size * (this.heightMap.width / this.settings.width),
    };

    // Get target height for flatten
    const targetHeight = this.heightMap.get(Math.floor(hx), Math.floor(hz));

    this.heightMap.applyBrush(hx, hz, scaledBrush, operation, targetHeight);
    this.updateGeometryFromHeightMap();
  }

  getHeightMap(): HeightMap {
    return this.heightMap;
  }

  setHeightMap(heightMap: HeightMap): void {
    this.heightMap = heightMap;
    this.updateGeometryFromHeightMap();
  }

  addLayer(layer: TerrainLayer): void {
    this.terrainLayers.push(layer);
    this.updateMaterial();
  }

  removeLayer(layerId: string): void {
    this.terrainLayers = this.terrainLayers.filter(l => l.id !== layerId);
    this.updateMaterial();
  }

  getLayers(): TerrainLayer[] {
    return this.terrainLayers;
  }

  private updateMaterial(): void {
    // For now, just update the base material
    // A full implementation would use a custom shader for texture splatting
    if (this.terrainLayers.length > 0) {
      // Use first layer as base color
      // In production, this would be a splat map shader
    }
  }

  getSettings(): TerrainSettings {
    return this.settings;
  }
}

// ============================================================================
// TERRAIN MANAGER
// ============================================================================

export class TerrainManager extends EventEmitter {
  private terrain: TerrainMesh | null = null;
  private foliageTypes: Map<string, FoliageType> = new Map();
  private foliageInstances: FoliageInstance[] = [];
  private foliageGroup: THREE.Group = new THREE.Group();
  private currentBrush: BrushSettings;
  private currentOperation: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise' = 'raise';

  constructor() {
    super();

    this.currentBrush = {
      size: 10,
      strength: 0.5,
      falloff: 2,
      shape: 'circle',
    };
  }

  createTerrain(settings: TerrainSettings): TerrainMesh {
    if (this.terrain) {
      this.terrain.geometry.dispose();
      if (this.terrain.material instanceof THREE.Material) {
        this.terrain.material.dispose();
      }
    }

    this.terrain = new TerrainMesh(settings);
    this.emit('terrainCreated', { terrain: this.terrain });

    return this.terrain;
  }

  getTerrain(): TerrainMesh | null {
    return this.terrain;
  }

  generateProceduralTerrain(noiseSettings: NoiseSettings): void {
    if (!this.terrain) return;

    const heightMap = this.terrain.getHeightMap();
    heightMap.generateFromNoise(noiseSettings);
    this.terrain.updateGeometryFromHeightMap();

    this.emit('terrainGenerated', { noiseSettings });
  }

  generateDiamondSquare(roughness: number, seed: number): void {
    if (!this.terrain) return;

    const heightMap = this.terrain.getHeightMap();
    heightMap.generateDiamondSquare(roughness, seed);
    this.terrain.updateGeometryFromHeightMap();

    this.emit('terrainGenerated', { type: 'diamond-square', roughness, seed });
  }

  async importHeightMap(imageUrl: string): Promise<void> {
    if (!this.terrain) return;

    const image = await this.loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const heightMap = HeightMap.fromImageData(imageData);

    this.terrain.setHeightMap(heightMap);
    this.emit('heightMapImported', { url: imageUrl });
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  exportHeightMap(): ImageData | null {
    if (!this.terrain) return null;
    return this.terrain.getHeightMap().toImageData();
  }

  // Sculpting
  setBrush(settings: Partial<BrushSettings>): void {
    this.currentBrush = { ...this.currentBrush, ...settings };
    this.emit('brushChanged', { brush: this.currentBrush });
  }

  getBrush(): BrushSettings {
    return this.currentBrush;
  }

  setOperation(operation: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise'): void {
    this.currentOperation = operation;
    this.emit('operationChanged', { operation });
  }

  getOperation(): string {
    return this.currentOperation;
  }

  sculpt(worldX: number, worldZ: number): void {
    if (!this.terrain) return;
    this.terrain.sculpt(worldX, worldZ, this.currentBrush, this.currentOperation);
    this.emit('terrainSculpted', { x: worldX, z: worldZ });
  }

  // Foliage
  registerFoliageType(type: FoliageType): void {
    this.foliageTypes.set(type.id, type);
    this.emit('foliageTypeAdded', { type });
  }

  removeFoliageType(typeId: string): void {
    this.foliageTypes.delete(typeId);
    this.foliageInstances = this.foliageInstances.filter(f => f.typeId !== typeId);
    this.emit('foliageTypeRemoved', { typeId });
  }

  getFoliageTypes(): FoliageType[] {
    return Array.from(this.foliageTypes.values());
  }

  paintFoliage(
    worldX: number,
    worldZ: number,
    typeId: string,
    radius: number,
    density: number
  ): void {
    if (!this.terrain) return;

    const type = this.foliageTypes.get(typeId);
    if (!type) return;

    // Generate instances within radius
    const numInstances = Math.floor(radius * radius * density);

    for (let i = 0; i < numInstances; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;

      const x = worldX + Math.cos(angle) * dist;
      const z = worldZ + Math.sin(angle) * dist;
      const y = this.terrain.getHeightAt(x, z);

      // Check slope/height constraints
      const normal = this.terrain.getNormalAt(x, z);
      const slope = Math.acos(normal.y);

      if (slope < type.minSlope || slope > type.maxSlope) continue;
      if (y < type.minHeight || y > type.maxHeight) continue;

      // Create instance
      const scale = type.minScale + Math.random() * (type.maxScale - type.minScale);
      const rotation = new THREE.Euler(
        type.alignToNormal ? Math.atan2(normal.z, normal.y) : 0,
        type.randomRotation ? Math.random() * Math.PI * 2 : 0,
        type.alignToNormal ? Math.atan2(normal.x, normal.y) : 0
      );

      this.foliageInstances.push({
        position: new THREE.Vector3(x, y, z),
        rotation,
        scale: new THREE.Vector3(scale, scale, scale),
        typeId,
      });
    }

    this.updateFoliageGroup();
    this.emit('foliagePainted', { x: worldX, z: worldZ, typeId, count: numInstances });
  }

  eraseFoliage(worldX: number, worldZ: number, radius: number): void {
    const before = this.foliageInstances.length;

    this.foliageInstances = this.foliageInstances.filter(instance => {
      const dx = instance.position.x - worldX;
      const dz = instance.position.z - worldZ;
      return Math.sqrt(dx * dx + dz * dz) > radius;
    });

    const removed = before - this.foliageInstances.length;
    if (removed > 0) {
      this.updateFoliageGroup();
      this.emit('foliageErased', { x: worldX, z: worldZ, count: removed });
    }
  }

  private updateFoliageGroup(): void {
    // Clear existing
    while (this.foliageGroup.children.length > 0) {
      this.foliageGroup.remove(this.foliageGroup.children[0]);
    }

    // Group instances by type for instanced rendering
    const instancesByType = new Map<string, FoliageInstance[]>();

    for (const instance of this.foliageInstances) {
      if (!instancesByType.has(instance.typeId)) {
        instancesByType.set(instance.typeId, []);
      }
      instancesByType.get(instance.typeId)!.push(instance);
    }

    // Create instanced meshes for each type
    for (const [typeId, instances] of instancesByType) {
      const type = this.foliageTypes.get(typeId);
      if (!type || !type.mesh) continue;

      // For simplicity, create individual meshes
      // In production, use InstancedMesh for performance
      for (const instance of instances) {
        const mesh = type.mesh.clone();
        mesh.position.copy(instance.position);
        mesh.rotation.copy(instance.rotation);
        mesh.scale.copy(instance.scale);
        this.foliageGroup.add(mesh);
      }
    }
  }

  getFoliageGroup(): THREE.Group {
    return this.foliageGroup;
  }

  getFoliageInstances(): FoliageInstance[] {
    return this.foliageInstances;
  }

  clearFoliage(): void {
    this.foliageInstances = [];
    this.updateFoliageGroup();
    this.emit('foliageCleared');
  }

  // Serialization
  serialize(): string {
    if (!this.terrain) return '{}';

    const data = {
      settings: this.terrain.getSettings(),
      heightMapData: Array.from(this.terrain.getHeightMap().getData()),
      layers: this.terrain.getLayers(),
      foliageTypes: Array.from(this.foliageTypes.values()),
      foliageInstances: this.foliageInstances.map(f => ({
        position: { x: f.position.x, y: f.position.y, z: f.position.z },
        rotation: { x: f.rotation.x, y: f.rotation.y, z: f.rotation.z },
        scale: { x: f.scale.x, y: f.scale.y, z: f.scale.z },
        typeId: f.typeId,
      })),
    };

    return JSON.stringify(data);
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);

    // Create terrain
    this.createTerrain(data.settings);

    // Restore height map
    if (this.terrain && data.heightMapData) {
      const heightMap = this.terrain.getHeightMap();
      const floatArray = new Float32Array(data.heightMapData);
      for (let i = 0; i < floatArray.length; i++) {
        const x = i % heightMap.width;
        const y = Math.floor(i / heightMap.width);
        heightMap.set(x, y, floatArray[i]);
      }
      this.terrain.updateGeometryFromHeightMap();
    }

    // Restore layers
    if (data.layers) {
      for (const layer of data.layers) {
        this.terrain?.addLayer(layer);
      }
    }

    // Restore foliage types
    if (data.foliageTypes) {
      for (const type of data.foliageTypes) {
        this.foliageTypes.set(type.id, { ...type, mesh: null });
      }
    }

    // Restore foliage instances
    if (data.foliageInstances) {
      this.foliageInstances = data.foliageInstances.map((f: FoliageInstance & { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }) => ({
        position: new THREE.Vector3(f.position.x, f.position.y, f.position.z),
        rotation: new THREE.Euler(f.rotation.x, f.rotation.y, f.rotation.z),
        scale: new THREE.Vector3(f.scale.x, f.scale.y, f.scale.z),
        typeId: f.typeId,
      }));
    }

    this.emit('terrainLoaded');
  }

  dispose(): void {
    if (this.terrain) {
      this.terrain.geometry.dispose();
      if (this.terrain.material instanceof THREE.Material) {
        this.terrain.material.dispose();
      }
    }

    this.foliageTypes.clear();
    this.foliageInstances = [];

    while (this.foliageGroup.children.length > 0) {
      this.foliageGroup.remove(this.foliageGroup.children[0]);
    }
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

export function useTerrainManager() {
  const managerRef = useRef<TerrainManager>(new TerrainManager());
  const [terrain, setTerrain] = useState<TerrainMesh | null>(null);
  const [brush, setBrush] = useState<BrushSettings>(managerRef.current.getBrush());
  const [operation, setOperation] = useState<string>(managerRef.current.getOperation());
  const [foliageTypes, setFoliageTypes] = useState<FoliageType[]>([]);

  useEffect(() => {
    const manager = managerRef.current;

    manager.on('terrainCreated', ({ terrain: t }) => setTerrain(t));
    manager.on('brushChanged', ({ brush: b }) => setBrush(b));
    manager.on('operationChanged', ({ operation: o }) => setOperation(o));
    manager.on('foliageTypeAdded', () => setFoliageTypes(manager.getFoliageTypes()));
    manager.on('foliageTypeRemoved', () => setFoliageTypes(manager.getFoliageTypes()));

    return () => {
      manager.removeAllListeners();
      manager.dispose();
    };
  }, []);

  const createTerrain = useCallback((settings: TerrainSettings) => {
    return managerRef.current.createTerrain(settings);
  }, []);

  const generateProcedural = useCallback((noiseSettings: NoiseSettings) => {
    managerRef.current.generateProceduralTerrain(noiseSettings);
  }, []);

  const generateDiamondSquare = useCallback((roughness: number, seed: number) => {
    managerRef.current.generateDiamondSquare(roughness, seed);
  }, []);

  const sculpt = useCallback((worldX: number, worldZ: number) => {
    managerRef.current.sculpt(worldX, worldZ);
  }, []);

  const updateBrush = useCallback((settings: Partial<BrushSettings>) => {
    managerRef.current.setBrush(settings);
  }, []);

  const updateOperation = useCallback((op: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise') => {
    managerRef.current.setOperation(op);
  }, []);

  const paintFoliage = useCallback((x: number, z: number, typeId: string, radius: number, density: number) => {
    managerRef.current.paintFoliage(x, z, typeId, radius, density);
  }, []);

  const eraseFoliage = useCallback((x: number, z: number, radius: number) => {
    managerRef.current.eraseFoliage(x, z, radius);
  }, []);

  return {
    manager: managerRef.current,
    terrain,
    brush,
    operation,
    foliageTypes,
    createTerrain,
    generateProcedural,
    generateDiamondSquare,
    sculpt,
    updateBrush,
    updateOperation,
    paintFoliage,
    eraseFoliage,
    serialize: () => managerRef.current.serialize(),
    deserialize: (json: string) => managerRef.current.deserialize(json),
    getFoliageGroup: () => managerRef.current.getFoliageGroup(),
  };
}

const __defaultExport = {
  HeightMap,
  TerrainMesh,
  TerrainManager,
  PerlinNoise,
};

export default __defaultExport;
