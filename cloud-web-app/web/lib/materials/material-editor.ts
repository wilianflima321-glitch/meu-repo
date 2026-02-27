/**
 * Material Editor System - Sistema de Edição de Materiais
 * 
 * Sistema completo para criação e edição de materiais PBR.
 * Suporta:
 * - Material node graph
 * - PBR textures (albedo, normal, roughness, metalness, AO, emission)
 * - Shader customization
 * - Material presets
 * - Real-time preview
 * 
 * @module lib/materials/material-editor
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES / PRESETS (EXTRACTED)
// ============================================================================

import { DEFAULT_PRESETS } from './material-editor.presets';
import type {
  MaterialPreset,
  MaterialSettings,
  MaterialType,
  TextureSettings,
  TextureSlot,
} from './material-editor.types';

export { DEFAULT_PRESETS };
export type {
  MaterialNode,
  MaterialPreset,
  MaterialSettings,
  MaterialType,
  NodeConnection,
  TextureSettings,
  TextureSlot,
} from './material-editor.types';

// ============================================================================
// MATERIAL FACTORY
// ============================================================================

export class MaterialFactory {
  private textureLoader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture> = new Map();
  
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }
  
  createDefaultSettings(): MaterialSettings {
    return {
      id: this.generateId(),
      name: 'New Material',
      type: 'standard',
      
      color: { r: 0.8, g: 0.8, b: 0.8 },
      opacity: 1,
      transparent: false,
      
      metalness: 0,
      roughness: 0.5,
      
      emissive: { r: 0, g: 0, b: 0 },
      emissiveIntensity: 1,
      
      clearcoat: 0,
      clearcoatRoughness: 0,
      sheen: 0,
      sheenRoughness: 1,
      sheenColor: { r: 1, g: 1, b: 1 },
      transmission: 0,
      thickness: 0,
      ior: 1.5,
      reflectivity: 0.5,
      
      normalScale: { x: 1, y: 1 },
      displacementScale: 1,
      displacementBias: 0,
      bumpScale: 1,
      
      aoMapIntensity: 1,
      lightMapIntensity: 1,
      envMapIntensity: 1,
      
      side: 'front',
      wireframe: false,
      flatShading: false,
      depthTest: true,
      depthWrite: true,
      alphaTest: 0,
      alphaToCoverage: false,
      
      textures: {},
    };
  }
  
  private generateId(): string {
    return `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async createMaterial(settings: MaterialSettings): Promise<THREE.Material> {
    const side = settings.side === 'front' ? THREE.FrontSide
      : settings.side === 'back' ? THREE.BackSide
      : THREE.DoubleSide;
    
    // Load textures
    const textures: Partial<Record<TextureSlot, THREE.Texture>> = {};
    for (const [slot, texSettings] of Object.entries(settings.textures)) {
      if (texSettings) {
        textures[slot as TextureSlot] = await this.loadTexture(texSettings);
      }
    }
    
    let material: THREE.Material;
    
    switch (settings.type) {
      case 'physical':
        material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          metalness: settings.metalness,
          roughness: settings.roughness,
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          clearcoat: settings.clearcoat,
          clearcoatRoughness: settings.clearcoatRoughness,
          sheen: settings.sheen,
          sheenRoughness: settings.sheenRoughness,
          sheenColor: new THREE.Color(settings.sheenColor.r, settings.sheenColor.g, settings.sheenColor.b),
          transmission: settings.transmission,
          thickness: settings.thickness,
          ior: settings.ior,
          reflectivity: settings.reflectivity,
          envMapIntensity: settings.envMapIntensity,
          side,
          wireframe: settings.wireframe,
          flatShading: settings.flatShading,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          normalMap: textures.normalMap,
          roughnessMap: textures.roughnessMap,
          metalnessMap: textures.metalnessMap,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          displacementMap: textures.displacementMap,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
          lightMap: textures.lightMap,
          clearcoatMap: textures.clearcoatMap,
          clearcoatNormalMap: textures.clearcoatNormalMap,
          clearcoatRoughnessMap: textures.clearcoatRoughnessMap,
          sheenColorMap: textures.sheenColorMap,
          sheenRoughnessMap: textures.sheenRoughnessMap,
          transmissionMap: textures.transmissionMap,
          thicknessMap: textures.thicknessMap,
        });
        break;
        
      case 'standard':
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          metalness: settings.metalness,
          roughness: settings.roughness,
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          envMapIntensity: settings.envMapIntensity,
          side,
          wireframe: settings.wireframe,
          flatShading: settings.flatShading,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          normalMap: textures.normalMap,
          roughnessMap: textures.roughnessMap,
          metalnessMap: textures.metalnessMap,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          displacementMap: textures.displacementMap,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
          lightMap: textures.lightMap,
          bumpMap: textures.bumpMap,
        });
        break;
        
      case 'basic':
        material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          opacity: settings.opacity,
          transparent: settings.transparent,
          side,
          wireframe: settings.wireframe,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
        });
        break;
        
      case 'phong':
        material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          side,
          wireframe: settings.wireframe,
          flatShading: settings.flatShading,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          normalMap: textures.normalMap,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          displacementMap: textures.displacementMap,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
          lightMap: textures.lightMap,
          bumpMap: textures.bumpMap,
          specularMap: textures.specularMap,
        });
        break;
        
      case 'lambert':
        material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          side,
          wireframe: settings.wireframe,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
          lightMap: textures.lightMap,
          bumpMap: textures.bumpMap,
          specularMap: textures.specularMap,
        });
        break;
        
      case 'toon':
        material = new THREE.MeshToonMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          side,
          wireframe: settings.wireframe,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          normalMap: textures.normalMap,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          displacementMap: textures.displacementMap,
          alphaMap: textures.alphaMap,
          lightMap: textures.lightMap,
          bumpMap: textures.bumpMap,
        });
        break;
        
      case 'custom':
        if (settings.customShader) {
          material = new THREE.ShaderMaterial({
            vertexShader: settings.customShader.vertexShader,
            fragmentShader: settings.customShader.fragmentShader,
            uniforms: settings.customShader.uniforms as Record<string, THREE.IUniform>,
            transparent: settings.transparent,
            side,
            wireframe: settings.wireframe,
            depthTest: settings.depthTest,
            depthWrite: settings.depthWrite,
          });
        } else {
          material = new THREE.MeshStandardMaterial();
        }
        break;
        
      default:
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
        });
    }
    
    // Apply normal scale
    if ('normalScale' in material && settings.normalScale) {
      (material as THREE.MeshStandardMaterial).normalScale.set(
        settings.normalScale.x,
        settings.normalScale.y
      );
    }
    
    // Apply displacement settings
    if ('displacementScale' in material) {
      (material as THREE.MeshStandardMaterial).displacementScale = settings.displacementScale;
      (material as THREE.MeshStandardMaterial).displacementBias = settings.displacementBias;
    }
    
    // Apply AO intensity
    if ('aoMapIntensity' in material) {
      (material as THREE.MeshStandardMaterial).aoMapIntensity = settings.aoMapIntensity;
    }
    
    // Store settings on material userData
    material.userData.settings = settings;
    
    return material;
  }
  
  private async loadTexture(settings: TextureSettings): Promise<THREE.Texture> {
    // Check cache
    const cacheKey = `${settings.uri}_${JSON.stringify(settings)}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(settings.uri, resolve, undefined, reject);
    });
    
    // Apply settings
    texture.repeat.set(settings.repeat.x, settings.repeat.y);
    texture.offset.set(settings.offset.x, settings.offset.y);
    texture.rotation = settings.rotation;
    texture.flipY = settings.flipY;
    texture.anisotropy = settings.anisotropy;
    
    const wrapMap = {
      repeat: THREE.RepeatWrapping,
      clamp: THREE.ClampToEdgeWrapping,
      mirror: THREE.MirroredRepeatWrapping,
    };
    texture.wrapS = wrapMap[settings.wrapS];
    texture.wrapT = wrapMap[settings.wrapT];
    
    if (settings.encoding === 'sRGB') {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else {
      texture.colorSpace = THREE.LinearSRGBColorSpace;
    }
    
    texture.needsUpdate = true;
    
    // Cache
    this.textureCache.set(cacheKey, texture);
    
    return texture;
  }
  
  applyPreset(settings: MaterialSettings, preset: MaterialPreset): MaterialSettings {
    return {
      ...settings,
      ...preset.settings,
      id: settings.id,
      name: settings.name,
    };
  }
  
  clearTextureCache(): void {
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }
}

// ============================================================================
// MATERIAL EDITOR
// ============================================================================

export class MaterialEditor extends EventEmitter {
  private factory: MaterialFactory;
  private materials: Map<string, MaterialSettings> = new Map();
  private activeMaterialId: string | null = null;
  private presets: MaterialPreset[] = [...DEFAULT_PRESETS];
  private history: { materialId: string; previous: MaterialSettings; current: MaterialSettings }[] = [];
  private historyIndex = -1;
  private maxHistorySize = 50;
  
  constructor() {
    super();
    this.factory = new MaterialFactory();
  }
  
  // Material CRUD
  createMaterial(name?: string): MaterialSettings {
    const settings = this.factory.createDefaultSettings();
    if (name) settings.name = name;
    
    this.materials.set(settings.id, settings);
    this.emit('materialCreated', { material: settings });
    
    return settings;
  }
  
  async getMaterial(id: string): Promise<THREE.Material | null> {
    const settings = this.materials.get(id);
    if (!settings) return null;
    
    return this.factory.createMaterial(settings);
  }
  
  getSettings(id: string): MaterialSettings | undefined {
    return this.materials.get(id);
  }
  
  getAllMaterials(): MaterialSettings[] {
    return Array.from(this.materials.values());
  }
  
  deleteMaterial(id: string): void {
    this.materials.delete(id);
    
    if (this.activeMaterialId === id) {
      this.activeMaterialId = null;
    }
    
    this.emit('materialDeleted', { id });
  }
  
  duplicateMaterial(id: string): MaterialSettings | null {
    const original = this.materials.get(id);
    if (!original) return null;
    
    const duplicate: MaterialSettings = {
      ...JSON.parse(JSON.stringify(original)),
      id: this.factory.createDefaultSettings().id,
      name: `${original.name} (Copy)`,
    };
    
    this.materials.set(duplicate.id, duplicate);
    this.emit('materialCreated', { material: duplicate });
    
    return duplicate;
  }
  
  // Active material
  setActiveMaterial(id: string | null): void {
    this.activeMaterialId = id;
    this.emit('activeMaterialChanged', { id });
  }
  
  getActiveMaterial(): MaterialSettings | null {
    if (!this.activeMaterialId) return null;
    return this.materials.get(this.activeMaterialId) || null;
  }
  
  // Update material properties
  updateMaterial(id: string, updates: Partial<MaterialSettings>): void {
    const current = this.materials.get(id);
    if (!current) return;
    
    const previous = { ...current };
    const updated = { ...current, ...updates };
    
    this.materials.set(id, updated);
    
    // Add to history
    this.addToHistory(id, previous, updated);
    
    this.emit('materialUpdated', { id, updates, material: updated });
  }
  
  updateColor(id: string, color: { r: number; g: number; b: number }): void {
    this.updateMaterial(id, { color });
  }
  
  updateMetalness(id: string, metalness: number): void {
    this.updateMaterial(id, { metalness: Math.max(0, Math.min(1, metalness)) });
  }
  
  updateRoughness(id: string, roughness: number): void {
    this.updateMaterial(id, { roughness: Math.max(0, Math.min(1, roughness)) });
  }
  
  updateEmissive(id: string, emissive: { r: number; g: number; b: number }, intensity: number): void {
    this.updateMaterial(id, { emissive, emissiveIntensity: intensity });
  }
  
  // Texture management
  async setTexture(id: string, slot: TextureSlot, uri: string): Promise<void> {
    const current = this.materials.get(id);
    if (!current) return;
    
    const textureSettings: TextureSettings = {
      uri,
      repeat: { x: 1, y: 1 },
      offset: { x: 0, y: 0 },
      rotation: 0,
      wrapS: 'repeat',
      wrapT: 'repeat',
      flipY: true,
      encoding: slot === 'map' || slot === 'emissiveMap' ? 'sRGB' : 'linear',
      anisotropy: 4,
    };
    
    const textures = { ...current.textures, [slot]: textureSettings };
    this.updateMaterial(id, { textures });
  }
  
  updateTextureSettings(id: string, slot: TextureSlot, settings: Partial<TextureSettings>): void {
    const current = this.materials.get(id);
    if (!current || !current.textures[slot]) return;
    
    const updatedSlot = { ...current.textures[slot]!, ...settings };
    const textures = { ...current.textures, [slot]: updatedSlot };
    this.updateMaterial(id, { textures });
  }
  
  removeTexture(id: string, slot: TextureSlot): void {
    const current = this.materials.get(id);
    if (!current) return;
    
    const textures = { ...current.textures };
    delete textures[slot];
    this.updateMaterial(id, { textures });
  }
  
  // Presets
  applyPreset(id: string, presetId: string): void {
    const current = this.materials.get(id);
    const preset = this.presets.find(p => p.id === presetId);
    if (!current || !preset) return;
    
    const updated = this.factory.applyPreset(current, preset);
    this.materials.set(id, updated);
    
    this.emit('materialUpdated', { id, material: updated });
  }
  
  getPresets(): MaterialPreset[] {
    return this.presets;
  }
  
  getPresetsByCategory(): Record<string, MaterialPreset[]> {
    const byCategory: Record<string, MaterialPreset[]> = {};
    
    for (const preset of this.presets) {
      if (!byCategory[preset.category]) {
        byCategory[preset.category] = [];
      }
      byCategory[preset.category].push(preset);
    }
    
    return byCategory;
  }
  
  addCustomPreset(name: string, category: string, materialId: string): MaterialPreset {
    const settings = this.materials.get(materialId);
    if (!settings) throw new Error('Material not found');
    
    const preset: MaterialPreset = {
      id: `custom_${Date.now()}`,
      name,
      category,
      settings: { ...settings },
    };
    
    this.presets.push(preset);
    this.emit('presetAdded', { preset });
    
    return preset;
  }
  
  // History (Undo/Redo)
  private addToHistory(
    materialId: string,
    previous: MaterialSettings,
    current: MaterialSettings
  ): void {
    // Remove any redo history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    this.history.push({ materialId, previous, current });
    this.historyIndex++;
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }
  
  undo(): void {
    if (this.historyIndex < 0) return;
    
    const { materialId, previous } = this.history[this.historyIndex];
    this.materials.set(materialId, previous);
    this.historyIndex--;
    
    this.emit('materialUpdated', { id: materialId, material: previous });
    this.emit('historyChanged', { canUndo: this.canUndo(), canRedo: this.canRedo() });
  }
  
  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    
    this.historyIndex++;
    const { materialId, current } = this.history[this.historyIndex];
    this.materials.set(materialId, current);
    
    this.emit('materialUpdated', { id: materialId, material: current });
    this.emit('historyChanged', { canUndo: this.canUndo(), canRedo: this.canRedo() });
  }
  
  canUndo(): boolean {
    return this.historyIndex >= 0;
  }
  
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }
  
  // Import/Export
  exportMaterial(id: string): string {
    const settings = this.materials.get(id);
    if (!settings) throw new Error('Material not found');
    
    return JSON.stringify(settings, null, 2);
  }
  
  importMaterial(json: string): MaterialSettings {
    const settings = JSON.parse(json) as MaterialSettings;
    
    // Generate new ID
    settings.id = this.factory.createDefaultSettings().id;
    
    this.materials.set(settings.id, settings);
    this.emit('materialCreated', { material: settings });
    
    return settings;
  }
  
  exportAllMaterials(): string {
    const all = Array.from(this.materials.values());
    return JSON.stringify(all, null, 2);
  }
  
  importAllMaterials(json: string): void {
    const materials = JSON.parse(json) as MaterialSettings[];
    
    for (const mat of materials) {
      mat.id = this.factory.createDefaultSettings().id;
      this.materials.set(mat.id, mat);
      this.emit('materialCreated', { material: mat });
    }
  }
  
  // Cleanup
  dispose(): void {
    this.factory.clearTextureCache();
    this.materials.clear();
    this.history = [];
    this.historyIndex = -1;
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export function useMaterialEditor() {
  const editorRef = useRef<MaterialEditor>(new MaterialEditor());
  const [materials, setMaterials] = useState<MaterialSettings[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  useEffect(() => {
    const editor = editorRef.current;
    
    const updateMaterials = () => setMaterials(editor.getAllMaterials());
    
    editor.on('materialCreated', updateMaterials);
    editor.on('materialUpdated', updateMaterials);
    editor.on('materialDeleted', updateMaterials);
    editor.on('activeMaterialChanged', ({ id }) => setActiveMaterialId(id));
    editor.on('historyChanged', ({ canUndo: u, canRedo: r }) => {
      setCanUndo(u);
      setCanRedo(r);
    });
    
    return () => {
      editor.removeAllListeners();
      editor.dispose();
    };
  }, []);
  
  const activeMaterial = useMemo(() => {
    return materials.find(m => m.id === activeMaterialId) || null;
  }, [materials, activeMaterialId]);
  
  const presetsByCategory = useMemo(() => {
    return editorRef.current.getPresetsByCategory();
  }, []);
  
  const createMaterial = useCallback((name?: string) => {
    return editorRef.current.createMaterial(name);
  }, []);
  
  const deleteMaterial = useCallback((id: string) => {
    editorRef.current.deleteMaterial(id);
  }, []);
  
  const duplicateMaterial = useCallback((id: string) => {
    return editorRef.current.duplicateMaterial(id);
  }, []);
  
  const updateMaterial = useCallback((id: string, updates: Partial<MaterialSettings>) => {
    editorRef.current.updateMaterial(id, updates);
  }, []);
  
  const setTexture = useCallback(async (id: string, slot: TextureSlot, uri: string) => {
    await editorRef.current.setTexture(id, slot, uri);
  }, []);
  
  const removeTexture = useCallback((id: string, slot: TextureSlot) => {
    editorRef.current.removeTexture(id, slot);
  }, []);
  
  const applyPreset = useCallback((id: string, presetId: string) => {
    editorRef.current.applyPreset(id, presetId);
  }, []);
  
  const undo = useCallback(() => {
    editorRef.current.undo();
  }, []);
  
  const redo = useCallback(() => {
    editorRef.current.redo();
  }, []);
  
  const getMaterial = useCallback(async (id: string) => {
    return editorRef.current.getMaterial(id);
  }, []);
  
  return {
    editor: editorRef.current,
    materials,
    activeMaterial,
    activeMaterialId,
    presetsByCategory,
    canUndo,
    canRedo,
    createMaterial,
    deleteMaterial,
    duplicateMaterial,
    updateMaterial,
    setTexture,
    removeTexture,
    applyPreset,
    setActiveMaterial: (id: string | null) => editorRef.current.setActiveMaterial(id),
    undo,
    redo,
    getMaterial,
    exportMaterial: (id: string) => editorRef.current.exportMaterial(id),
    importMaterial: (json: string) => editorRef.current.importMaterial(json),
  };
}

const __defaultExport = {
  MaterialFactory,
  MaterialEditor,
  DEFAULT_PRESETS,
};

export default __defaultExport;
