/**
 * SAVE/LOAD GAME SYSTEM - Aethel Engine
 * 
 * Sistema completo de save/load para jogos.
 * 
 * FEATURES:
 * - Auto-save
 * - Multiple save slots
 * - Save versioning e migration
 * - Compression
 * - Cloud sync ready
 * - Screenshot thumbnails
 * - Save metadata
 * - Async loading
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export interface SaveMetadata {
  id: string;
  name: string;
  timestamp: number;
  playTime: number;
  version: number;
  thumbnail?: string;
  location?: string;
  chapter?: string;
  customData?: Record<string, any>;
}

export interface SaveData {
  metadata: SaveMetadata;
  gameState: any;
  worldState: any;
  playerState: any;
  checksum: string;
}

export interface SaveConfig {
  maxSlots: number;
  autoSaveInterval: number;
  autoSaveEnabled: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  cloudSyncEnabled: boolean;
  thumbnailSize: { width: number; height: number };
  storageKey: string;
}

export interface SaveableComponent {
  getSaveData(): any;
  loadSaveData(data: any): void;
  getComponentId(): string;
}

// ============================================================================
// SERIALIZERS
// ============================================================================

export class Vector3Serializer {
  static serialize(vec: THREE.Vector3): { x: number; y: number; z: number } {
    return { x: vec.x, y: vec.y, z: vec.z };
  }
  
  static deserialize(data: { x: number; y: number; z: number }): THREE.Vector3 {
    return new THREE.Vector3(data.x, data.y, data.z);
  }
}

export class QuaternionSerializer {
  static serialize(quat: THREE.Quaternion): { x: number; y: number; z: number; w: number } {
    return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
  }
  
  static deserialize(data: { x: number; y: number; z: number; w: number }): THREE.Quaternion {
    return new THREE.Quaternion(data.x, data.y, data.z, data.w);
  }
}

export class ColorSerializer {
  static serialize(color: THREE.Color): { r: number; g: number; b: number } {
    return { r: color.r, g: color.g, b: color.b };
  }
  
  static deserialize(data: { r: number; g: number; b: number }): THREE.Color {
    return new THREE.Color(data.r, data.g, data.b);
  }
}

// ============================================================================
// COMPRESSION
// ============================================================================

export class SaveCompressor {
  static async compress(data: string): Promise<string> {
    // Use CompressionStream if available
    if (typeof CompressionStream !== 'undefined') {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(data));
          controller.close();
        }
      }).pipeThrough(new CompressionStream('gzip'));
      
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return btoa(String.fromCharCode(...result));
    }
    
    // Fallback: simple RLE compression
    return this.simpleCompress(data);
  }
  
  static async decompress(data: string): Promise<string> {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          }
        }).pipeThrough(new DecompressionStream('gzip'));
        
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        return new TextDecoder().decode(result);
      } catch {
        // Fall back to simple decompression
        return this.simpleDecompress(data);
      }
    }
    
    return this.simpleDecompress(data);
  }
  
  private static simpleCompress(data: string): string {
    // Base64 encode for now (real implementation would use LZ77 or similar)
    return btoa(encodeURIComponent(data));
  }
  
  private static simpleDecompress(data: string): string {
    try {
      return decodeURIComponent(atob(data));
    } catch {
      return data;
    }
  }
}

// ============================================================================
// CHECKSUM
// ============================================================================

export class SaveChecksum {
  static async calculate(data: string): Promise<string> {
    // Use Web Crypto API
    if (crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback: simple hash
    return this.simpleHash(data);
  }
  
  static async verify(data: string, checksum: string): Promise<boolean> {
    const calculated = await this.calculate(data);
    return calculated === checksum;
  }
  
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// ============================================================================
// SAVE SLOT
// ============================================================================

export class SaveSlot {
  readonly id: number;
  private metadata: SaveMetadata | null = null;
  private storageKey: string;
  
  constructor(id: number, storageKey: string) {
    this.id = id;
    this.storageKey = `${storageKey}_slot_${id}`;
  }
  
  async save(data: SaveData, config: SaveConfig): Promise<void> {
    let serialized = JSON.stringify(data);
    
    // Compress
    if (config.compressionEnabled) {
      serialized = await SaveCompressor.compress(serialized);
    }
    
    // Store
    localStorage.setItem(this.storageKey, serialized);
    localStorage.setItem(`${this.storageKey}_meta`, JSON.stringify(data.metadata));
    
    this.metadata = data.metadata;
  }
  
  async load(config: SaveConfig): Promise<SaveData | null> {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return null;
    
    let data = stored;
    
    // Decompress
    if (config.compressionEnabled) {
      data = await SaveCompressor.decompress(data);
    }
    
    try {
      const saveData = JSON.parse(data) as SaveData;
      
      // Verify checksum
      const gameStateStr = JSON.stringify(saveData.gameState);
      const isValid = await SaveChecksum.verify(gameStateStr, saveData.checksum);
      
      if (!isValid) {
        console.warn('Save data checksum mismatch');
        // Could throw error or attempt recovery
      }
      
      return saveData;
    } catch (e) {
      console.error('Failed to parse save data:', e);
      return null;
    }
  }
  
  getMetadata(): SaveMetadata | null {
    if (this.metadata) return this.metadata;
    
    const stored = localStorage.getItem(`${this.storageKey}_meta`);
    if (stored) {
      this.metadata = JSON.parse(stored);
    }
    
    return this.metadata;
  }
  
  isEmpty(): boolean {
    return !localStorage.getItem(this.storageKey);
  }
  
  delete(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(`${this.storageKey}_meta`);
    this.metadata = null;
  }
}

// ============================================================================
// SAVE MANAGER
// ============================================================================

export class SaveManager {
  private config: SaveConfig;
  private slots: SaveSlot[] = [];
  private components: Map<string, SaveableComponent> = new Map();
  private autoSaveTimer: number | null = null;
  private playTimeStart: number = Date.now();
  private totalPlayTime: number = 0;
  private currentVersion: number = 1;
  
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  
  private onSaveCallbacks: ((metadata: SaveMetadata) => void)[] = [];
  private onLoadCallbacks: ((data: SaveData) => void)[] = [];
  private onErrorCallbacks: ((error: Error) => void)[] = [];
  
  constructor(config: Partial<SaveConfig> = {}) {
    this.config = {
      maxSlots: config.maxSlots ?? 10,
      autoSaveInterval: config.autoSaveInterval ?? 300000, // 5 minutes
      autoSaveEnabled: config.autoSaveEnabled ?? true,
      compressionEnabled: config.compressionEnabled ?? true,
      encryptionEnabled: config.encryptionEnabled ?? false,
      cloudSyncEnabled: config.cloudSyncEnabled ?? false,
      thumbnailSize: config.thumbnailSize ?? { width: 320, height: 180 },
      storageKey: config.storageKey ?? 'aethel_save'
    };
    
    // Initialize slots
    for (let i = 0; i < this.config.maxSlots; i++) {
      this.slots.push(new SaveSlot(i, this.config.storageKey));
    }
    
    // Start auto-save if enabled
    if (this.config.autoSaveEnabled) {
      this.startAutoSave();
    }
  }
  
  setRenderer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }
  
  registerComponent(component: SaveableComponent): void {
    this.components.set(component.getComponentId(), component);
  }
  
  unregisterComponent(id: string): void {
    this.components.delete(id);
  }
  
  // ============================================================================
  // SAVE
  // ============================================================================
  
  async save(slotId: number, name?: string, customData?: Record<string, any>): Promise<void> {
    if (slotId < 0 || slotId >= this.config.maxSlots) {
      throw new Error(`Invalid slot ID: ${slotId}`);
    }
    
    try {
      // Collect save data from all components
      const gameState: Record<string, any> = {};
      
      for (const [id, component] of this.components) {
        gameState[id] = component.getSaveData();
      }
      
      // Calculate checksum
      const gameStateStr = JSON.stringify(gameState);
      const checksum = await SaveChecksum.calculate(gameStateStr);
      
      // Calculate play time
      const sessionTime = Date.now() - this.playTimeStart;
      const totalTime = this.totalPlayTime + sessionTime;
      
      // Generate thumbnail
      const thumbnail = await this.captureThumbnail();
      
      // Create metadata
      const metadata: SaveMetadata = {
        id: `${this.config.storageKey}_${slotId}_${Date.now()}`,
        name: name ?? `Save ${slotId + 1}`,
        timestamp: Date.now(),
        playTime: totalTime,
        version: this.currentVersion,
        thumbnail,
        customData
      };
      
      // Create save data
      const saveData: SaveData = {
        metadata,
        gameState,
        worldState: {}, // Could include world-specific data
        playerState: {}, // Could include player-specific data
        checksum
      };
      
      // Save to slot
      await this.slots[slotId].save(saveData, this.config);
      
      // Notify listeners
      for (const callback of this.onSaveCallbacks) {
        callback(metadata);
      }
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      for (const callback of this.onErrorCallbacks) {
        callback(err);
      }
      throw err;
    }
  }
  
  async quickSave(): Promise<void> {
    // Find first available slot or use slot 0
    let slotId = 0;
    
    for (let i = 0; i < this.config.maxSlots; i++) {
      if (this.slots[i].isEmpty()) {
        slotId = i;
        break;
      }
    }
    
    await this.save(slotId, 'Quick Save');
  }
  
  async autoSave(): Promise<void> {
    // Use dedicated auto-save slot (last slot)
    const autoSaveSlot = this.config.maxSlots - 1;
    await this.save(autoSaveSlot, 'Auto Save');
  }
  
  // ============================================================================
  // LOAD
  // ============================================================================
  
  async load(slotId: number): Promise<boolean> {
    if (slotId < 0 || slotId >= this.config.maxSlots) {
      throw new Error(`Invalid slot ID: ${slotId}`);
    }
    
    try {
      const saveData = await this.slots[slotId].load(this.config);
      
      if (!saveData) {
        return false;
      }
      
      // Version migration if needed
      if (saveData.metadata.version < this.currentVersion) {
        this.migrateData(saveData, saveData.metadata.version);
      }
      
      // Restore state to components
      for (const [id, data] of Object.entries(saveData.gameState)) {
        const component = this.components.get(id);
        if (component) {
          component.loadSaveData(data);
        }
      }
      
      // Restore play time
      this.totalPlayTime = saveData.metadata.playTime;
      this.playTimeStart = Date.now();
      
      // Notify listeners
      for (const callback of this.onLoadCallbacks) {
        callback(saveData);
      }
      
      return true;
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      for (const callback of this.onErrorCallbacks) {
        callback(err);
      }
      throw err;
    }
  }
  
  async quickLoad(): Promise<boolean> {
    // Find most recent save
    let mostRecentSlot = -1;
    let mostRecentTime = 0;
    
    for (let i = 0; i < this.config.maxSlots; i++) {
      const meta = this.slots[i].getMetadata();
      if (meta && meta.timestamp > mostRecentTime) {
        mostRecentTime = meta.timestamp;
        mostRecentSlot = i;
      }
    }
    
    if (mostRecentSlot >= 0) {
      return this.load(mostRecentSlot);
    }
    
    return false;
  }
  
  // ============================================================================
  // SLOT MANAGEMENT
  // ============================================================================
  
  getSlotMetadata(slotId: number): SaveMetadata | null {
    if (slotId < 0 || slotId >= this.config.maxSlots) {
      return null;
    }
    return this.slots[slotId].getMetadata();
  }
  
  getAllSlotMetadata(): (SaveMetadata | null)[] {
    return this.slots.map(slot => slot.getMetadata());
  }
  
  isSlotEmpty(slotId: number): boolean {
    if (slotId < 0 || slotId >= this.config.maxSlots) {
      return true;
    }
    return this.slots[slotId].isEmpty();
  }
  
  deleteSlot(slotId: number): void {
    if (slotId >= 0 && slotId < this.config.maxSlots) {
      this.slots[slotId].delete();
    }
  }
  
  deleteAllSlots(): void {
    for (const slot of this.slots) {
      slot.delete();
    }
  }
  
  // ============================================================================
  // AUTO-SAVE
  // ============================================================================
  
  startAutoSave(): void {
    this.stopAutoSave();
    
    this.autoSaveTimer = window.setInterval(() => {
      this.autoSave().catch(console.error);
    }, this.config.autoSaveInterval);
  }
  
  stopAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
  
  setAutoSaveInterval(ms: number): void {
    this.config.autoSaveInterval = ms;
    if (this.config.autoSaveEnabled) {
      this.startAutoSave();
    }
  }
  
  // ============================================================================
  // THUMBNAIL
  // ============================================================================
  
  private async captureThumbnail(): Promise<string | undefined> {
    if (!this.renderer || !this.scene || !this.camera) {
      return undefined;
    }
    
    // Render scene to canvas
    this.renderer.render(this.scene, this.camera);
    
    // Get canvas data
    const canvas = this.renderer.domElement;
    
    // Create smaller canvas for thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = this.config.thumbnailSize.width;
    thumbCanvas.height = this.config.thumbnailSize.height;
    
    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) return undefined;
    
    ctx.drawImage(
      canvas,
      0, 0, canvas.width, canvas.height,
      0, 0, thumbCanvas.width, thumbCanvas.height
    );
    
    return thumbCanvas.toDataURL('image/jpeg', 0.7);
  }
  
  // ============================================================================
  // VERSION MIGRATION
  // ============================================================================
  
  private migrateData(saveData: SaveData, fromVersion: number): void {
    // Migration logic for different versions
    // This would be implemented based on actual version changes
    
    console.log(`Migrating save from version ${fromVersion} to ${this.currentVersion}`);
    
    // Example migration
    // if (fromVersion < 2) {
    //   // Add new fields introduced in v2
    //   saveData.gameState.newField = defaultValue;
    // }
    
    saveData.metadata.version = this.currentVersion;
  }
  
  // ============================================================================
  // CALLBACKS
  // ============================================================================
  
  onSave(callback: (metadata: SaveMetadata) => void): void {
    this.onSaveCallbacks.push(callback);
  }
  
  onLoad(callback: (data: SaveData) => void): void {
    this.onLoadCallbacks.push(callback);
  }
  
  onError(callback: (error: Error) => void): void {
    this.onErrorCallbacks.push(callback);
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  getPlayTime(): number {
    const sessionTime = Date.now() - this.playTimeStart;
    return this.totalPlayTime + sessionTime;
  }
  
  getPlayTimeFormatted(): string {
    const totalMs = this.getPlayTime();
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Export save to file
  async exportSave(slotId: number): Promise<Blob> {
    const saveData = await this.slots[slotId].load(this.config);
    if (!saveData) {
      throw new Error('Save slot is empty');
    }
    
    const json = JSON.stringify(saveData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }
  
  // Import save from file
  async importSave(slotId: number, file: File): Promise<void> {
    const text = await file.text();
    const saveData = JSON.parse(text) as SaveData;
    
    // Validate
    if (!saveData.metadata || !saveData.gameState) {
      throw new Error('Invalid save file format');
    }
    
    // Verify checksum
    const gameStateStr = JSON.stringify(saveData.gameState);
    const isValid = await SaveChecksum.verify(gameStateStr, saveData.checksum);
    
    if (!isValid) {
      throw new Error('Save file checksum verification failed');
    }
    
    await this.slots[slotId].save(saveData, this.config);
  }
  
  dispose(): void {
    this.stopAutoSave();
    this.components.clear();
    this.onSaveCallbacks = [];
    this.onLoadCallbacks = [];
    this.onErrorCallbacks = [];
  }
}

// ============================================================================
// SAVEABLE ENTITY (Example implementation)
// ============================================================================

export class SaveableEntity implements SaveableComponent {
  private id: string;
  private object: THREE.Object3D;
  private customProperties: Record<string, any> = {};
  
  constructor(id: string, object: THREE.Object3D) {
    this.id = id;
    this.object = object;
  }
  
  getComponentId(): string {
    return this.id;
  }
  
  setCustomProperty(key: string, value: any): void {
    this.customProperties[key] = value;
  }
  
  getCustomProperty(key: string): any {
    return this.customProperties[key];
  }
  
  getSaveData(): any {
    return {
      position: Vector3Serializer.serialize(this.object.position),
      rotation: QuaternionSerializer.serialize(this.object.quaternion),
      scale: Vector3Serializer.serialize(this.object.scale),
      visible: this.object.visible,
      customProperties: { ...this.customProperties }
    };
  }
  
  loadSaveData(data: any): void {
    if (data.position) {
      this.object.position.copy(Vector3Serializer.deserialize(data.position));
    }
    if (data.rotation) {
      this.object.quaternion.copy(QuaternionSerializer.deserialize(data.rotation));
    }
    if (data.scale) {
      this.object.scale.copy(Vector3Serializer.deserialize(data.scale));
    }
    if (typeof data.visible === 'boolean') {
      this.object.visible = data.visible;
    }
    if (data.customProperties) {
      this.customProperties = { ...data.customProperties };
    }
  }
}

// ============================================================================
// PLAYER STATE (Example)
// ============================================================================

export class PlayerState implements SaveableComponent {
  health: number = 100;
  maxHealth: number = 100;
  mana: number = 50;
  maxMana: number = 50;
  level: number = 1;
  experience: number = 0;
  inventory: string[] = [];
  position: THREE.Vector3 = new THREE.Vector3();
  rotation: THREE.Euler = new THREE.Euler();
  
  getComponentId(): string {
    return 'player';
  }
  
  getSaveData(): any {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      mana: this.mana,
      maxMana: this.maxMana,
      level: this.level,
      experience: this.experience,
      inventory: [...this.inventory],
      position: Vector3Serializer.serialize(this.position),
      rotation: {
        x: this.rotation.x,
        y: this.rotation.y,
        z: this.rotation.z
      }
    };
  }
  
  loadSaveData(data: any): void {
    this.health = data.health ?? 100;
    this.maxHealth = data.maxHealth ?? 100;
    this.mana = data.mana ?? 50;
    this.maxMana = data.maxMana ?? 50;
    this.level = data.level ?? 1;
    this.experience = data.experience ?? 0;
    this.inventory = data.inventory ?? [];
    
    if (data.position) {
      this.position = Vector3Serializer.deserialize(data.position);
    }
    if (data.rotation) {
      this.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    }
  }
}

export default SaveManager;
