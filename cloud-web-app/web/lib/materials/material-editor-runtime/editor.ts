/**
 * Material Editor - split runtime modules.
 *
 * Three.js material factory and editor state stay behind Studio/material routes
 * instead of public route imports.
 */

import { EventEmitter } from 'events';
import { MaterialFactory } from './factory';
import { DEFAULT_PRESETS } from './presets';
import type { MaterialPreset, MaterialSettings, TextureSettings, TextureSlot } from './types';
import type * as THREE from 'three';

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
