/**
 * Save/Autosave Manager - Sistema de Salvamento Avançado
 * 
 * Sistema completo com:
 * - Multiple save slots
 * - Autosave with configurable intervals
 * - Save versioning and migration
 * - Compression support
 * - Cloud save integration
 * - Save validation and corruption detection
 * - Quick save/load
 * - Save metadata and previews
 * - Export/import functionality
 * 
 * @module lib/save/save-manager
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

import type {
  AudioSettings,
  CloudProvider,
  ContainerState,
  ControlSettings,
  EntityState,
  GameState,
  GameplaySettings,
  InventoryState,
  ItemState,
  NPCState,
  ObjectiveState,
  PlayerState,
  QuestState,
  SaveData,
  SaveLocation,
  SaveManagerConfig,
  SaveMetadata,
  SaveSlot,
  SaveStatus,
  SaveType,
  SettingsState,
  StatisticsState,
  StatusEffect,
  VideoSettings,
  WorldState,
} from './save-manager-types';

export type {
  AudioSettings,
  CloudProvider,
  ContainerState,
  ControlSettings,
  EntityState,
  GameState,
  GameplaySettings,
  InventoryState,
  ItemState,
  NPCState,
  ObjectiveState,
  PlayerState,
  QuestState,
  SaveData,
  SaveLocation,
  SaveManagerConfig,
  SaveMetadata,
  SaveSlot,
  SaveStatus,
  SaveType,
  SettingsState,
  StatisticsState,
  StatusEffect,
  VideoSettings,
  WorldState,
} from './save-manager-types';

// ============================================================================
// SAVE SERIALIZERS
// ============================================================================

export interface SaveSerializer {
  serialize(state: GameState): string;
  deserialize(data: string): GameState;
}

export class JSONSerializer implements SaveSerializer {
  serialize(state: GameState): string {
    return JSON.stringify(state);
  }
  
  deserialize(data: string): GameState {
    return JSON.parse(data);
  }
}

export class CompressedSerializer implements SaveSerializer {
  private base: SaveSerializer;
  
  constructor(base: SaveSerializer = new JSONSerializer()) {
    this.base = base;
  }
  
  serialize(state: GameState): string {
    const json = this.base.serialize(state);
    return this.compress(json);
  }
  
  deserialize(data: string): GameState {
    const json = this.decompress(data);
    return this.base.deserialize(json);
  }
  
  private compress(data: string): string {
    // Simple compression using btoa and removing repeated patterns
    // In production, use pako or similar
    return btoa(unescape(encodeURIComponent(data)));
  }
  
  private decompress(data: string): string {
    return decodeURIComponent(escape(atob(data)));
  }
}

// ============================================================================
// SAVE MIGRATION
// ============================================================================

export type MigrationFn = (state: GameState) => GameState;

export class SaveMigrator {
  private migrations: Map<number, MigrationFn> = new Map();
  
  register(fromVersion: number, migration: MigrationFn): void {
    this.migrations.set(fromVersion, migration);
  }
  
  migrate(state: GameState, fromVersion: number, toVersion: number): GameState {
    let current = state;
    
    for (let v = fromVersion; v < toVersion; v++) {
      const migration = this.migrations.get(v);
      if (migration) {
        current = migration(current);
      }
    }
    
    return current;
  }
  
  hasPath(fromVersion: number, toVersion: number): boolean {
    for (let v = fromVersion; v < toVersion; v++) {
      if (!this.migrations.has(v)) {
        return false;
      }
    }
    return true;
  }
}

// ============================================================================
// SAVE VALIDATION
// ============================================================================

export class SaveValidator {
  private static calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  
  static generateChecksum(state: GameState): string {
    const json = JSON.stringify(state);
    return this.calculateChecksum(json);
  }
  
  static validateChecksum(data: SaveData): boolean {
    const expected = data.metadata.checksum;
    const actual = this.generateChecksum(data.state);
    return expected === actual;
  }
  
  static validateStructure(state: unknown): state is GameState {
    if (!state || typeof state !== 'object') return false;
    
    const s = state as Record<string, unknown>;
    
    // Check required properties
    if (!s.player || typeof s.player !== 'object') return false;
    if (!s.world || typeof s.world !== 'object') return false;
    if (!Array.isArray(s.quests)) return false;
    if (!s.inventory || typeof s.inventory !== 'object') return false;
    
    return true;
  }
}

// ============================================================================
// SAVE MANAGER
// ============================================================================

export class SaveManager extends EventEmitter {
  private static instance: SaveManager | null = null;
  
  private config: SaveManagerConfig;
  private slots: SaveSlot[] = [];
  private serializer: SaveSerializer;
  private migrator: SaveMigrator;
  private cloudProvider: CloudProvider | null = null;
  
  private status: SaveStatus = 'idle';
  private autosaveTimer: ReturnType<typeof setInterval> | null = null;
  private lastAutosave = 0;
  private sessionStartTime = 0;
  private totalPlayTime = 0;
  
  private currentState: GameState | null = null;
  private stateProviders: Map<string, () => unknown> = new Map();
  
  constructor(config: Partial<SaveManagerConfig> = {}) {
    super();
    
    this.config = {
      maxSlots: 20,
      autosaveEnabled: true,
      autosaveInterval: 300, // 5 minutes
      maxAutosaves: 3,
      quicksaveSlot: 0,
      compressionEnabled: true,
      cloudSyncEnabled: false,
      saveVersion: 1,
      gameVersion: '1.0.0',
      storageKey: 'aethel_saves',
      ...config,
    };
    
    this.serializer = config.compressionEnabled
      ? new CompressedSerializer()
      : new JSONSerializer();
    
    this.migrator = new SaveMigrator();
    this.sessionStartTime = Date.now();
    
    // Initialize slots
    this.initializeSlots();
    
    // Load existing saves
    this.loadSavesFromStorage();
  }
  
  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  private initializeSlots(): void {
    for (let i = 0; i < this.config.maxSlots; i++) {
      this.slots.push({
        index: i,
        occupied: false,
        locked: false,
      });
    }
  }
  
  private loadSavesFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const indexData = localStorage.getItem(`${this.config.storageKey}_index`);
      if (!indexData) return;
      
      const index: SaveMetadata[] = JSON.parse(indexData);
      
      for (const metadata of index) {
        if (metadata.slotIndex >= 0 && metadata.slotIndex < this.slots.length) {
          this.slots[metadata.slotIndex] = {
            index: metadata.slotIndex,
            occupied: true,
            metadata,
            locked: false,
          };
        }
      }
      
      this.emit('savesLoaded', this.slots);
    } catch (error) {
      console.error('Failed to load save index:', error);
    }
  }
  
  private saveSaveIndex(): void {
    if (typeof localStorage === 'undefined') return;
    
    const index = this.slots
      .filter(s => s.occupied && s.metadata)
      .map(s => s.metadata);
    
    localStorage.setItem(
      `${this.config.storageKey}_index`,
      JSON.stringify(index)
    );
  }
  
  // ============================================================================
  // STATE PROVIDERS
  // ============================================================================
  
  registerStateProvider(key: string, provider: () => unknown): void {
    this.stateProviders.set(key, provider);
  }
  
  unregisterStateProvider(key: string): void {
    this.stateProviders.delete(key);
  }
  
  collectState(): GameState {
    const custom: Record<string, unknown> = {};
    
    for (const [key, provider] of this.stateProviders) {
      try {
        custom[key] = provider();
      } catch (error) {
        console.warn(`State provider ${key} failed:`, error);
      }
    }
    
    // Return current state with custom additions
    if (this.currentState) {
      return {
        ...this.currentState,
        custom: { ...this.currentState.custom, ...custom },
      };
    }
    
    // Default empty state
    return {
      player: this.createDefaultPlayerState(),
      world: this.createDefaultWorldState(),
      quests: [],
      inventory: { items: [], currency: {}, capacity: 100 },
      settings: this.createDefaultSettings(),
      statistics: this.createDefaultStatistics(),
      custom,
    };
  }
  
  private createDefaultPlayerState(): PlayerState {
    return {
      id: 'player_1',
      name: 'Player',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      health: 100,
      maxHealth: 100,
      level: 1,
      experience: 0,
      attributes: {},
      skills: {},
      abilities: [],
      equipment: {},
      statusEffects: [],
    };
  }
  
  private createDefaultWorldState(): WorldState {
    return {
      scene: 'main',
      time: 0,
      weather: 'clear',
      entities: [],
      triggers: {},
      doors: {},
      containers: {},
      npcs: {},
    };
  }
  
  private createDefaultSettings(): SettingsState {
    return {
      audio: {
        masterVolume: 1,
        musicVolume: 0.8,
        sfxVolume: 1,
        voiceVolume: 1,
        ambientVolume: 0.7,
        muted: false,
      },
      video: {
        resolution: { width: 1920, height: 1080 },
        fullscreen: true,
        vsync: true,
        fpsLimit: 60,
        quality: 'high',
        shadows: true,
        antialiasing: true,
        motionBlur: false,
        bloom: true,
      },
      controls: {
        keybindings: {},
        mouseSensitivity: 1,
        invertY: false,
        gamepadEnabled: true,
        vibration: true,
      },
      gameplay: {
        difficulty: 'normal',
        autoAim: false,
        subtitles: true,
        hints: true,
        language: 'en',
      },
    };
  }
  
  private createDefaultStatistics(): StatisticsState {
    return {
      totalPlayTime: 0,
      deaths: 0,
      kills: 0,
      distanceTraveled: 0,
      itemsCollected: 0,
      questsCompleted: 0,
      achievementsUnlocked: [],
      custom: {},
    };
  }
  
  // ============================================================================
  // SAVE OPERATIONS
  // ============================================================================
  
  async save(
    slotIndex: number,
    name: string,
    type: SaveType = 'manual',
    thumbnailUrl?: string
  ): Promise<SaveData> {
    if (this.status !== 'idle') {
      throw new Error('Save operation already in progress');
    }
    
    if (slotIndex < 0 || slotIndex >= this.config.maxSlots) {
      throw new Error(`Invalid slot index: ${slotIndex}`);
    }
    
    const slot = this.slots[slotIndex];
    if (slot.locked) {
      throw new Error('Slot is locked');
    }
    
    this.status = 'saving';
    this.emit('saveStarted', { slotIndex, type });
    
    try {
      const state = this.collectState();
      const serialized = this.serializer.serialize(state);
      
      const metadata: SaveMetadata = {
        id: this.generateSaveId(),
        slotIndex,
        name,
        type,
        version: this.config.saveVersion,
        createdAt: slot.metadata?.createdAt || Date.now(),
        modifiedAt: Date.now(),
        playTime: this.getSessionPlayTime() + this.totalPlayTime,
        location: state.world.scene,
        checksum: SaveValidator.generateChecksum(state),
        compressed: this.config.compressionEnabled,
        size: serialized.length,
        gameVersion: this.config.gameVersion,
        thumbnailUrl,
      };
      
      const saveData: SaveData = { metadata, state };
      
      // Save to local storage
      this.saveToStorage(slotIndex, serialized, metadata);
      
      // Update slot
      this.slots[slotIndex] = {
        index: slotIndex,
        occupied: true,
        metadata,
        locked: false,
      };
      
      // Save index
      this.saveSaveIndex();
      
      // Cloud sync
      if (this.config.cloudSyncEnabled && this.cloudProvider) {
        try {
          await this.cloudProvider.upload(saveData);
        } catch (cloudError) {
          console.warn('Cloud sync failed:', cloudError);
          this.emit('cloudSyncFailed', cloudError);
        }
      }
      
      this.status = 'idle';
      this.emit('saveComplete', saveData);
      
      return saveData;
    } catch (error) {
      this.status = 'error';
      this.emit('saveError', error);
      throw error;
    }
  }
  
  async quickSave(): Promise<SaveData> {
    return this.save(
      this.config.quicksaveSlot,
      'Quick Save',
      'quicksave'
    );
  }
  
  async autoSave(): Promise<SaveData | null> {
    if (!this.config.autosaveEnabled) return null;
    
    // Find or create autosave slot
    let autosaveSlot = this.findNextAutosaveSlot();
    
    try {
      const result = await this.save(
        autosaveSlot,
        `Autosave ${new Date().toLocaleString()}`,
        'autosave'
      );
      
      this.lastAutosave = Date.now();
      return result;
    } catch (error) {
      console.error('Autosave failed:', error);
      return null;
    }
  }
  
  private findNextAutosaveSlot(): number {
    // Find existing autosaves
    const autosaves = this.slots
      .filter(s => s.occupied && s.metadata?.type === 'autosave')
      .sort((a, b) => (a.metadata?.modifiedAt || 0) - (b.metadata?.modifiedAt || 0));
    
    // If we have max autosaves, use oldest
    if (autosaves.length >= this.config.maxAutosaves) {
      return autosaves[0].index;
    }
    
    // Find first empty slot (starting from end)
    for (let i = this.config.maxSlots - 1; i >= 0; i--) {
      if (!this.slots[i].occupied) {
        return i;
      }
    }
    
    // Use oldest autosave if no empty slots
    return autosaves[0]?.index || this.config.maxSlots - 1;
  }
  
  private saveToStorage(
    slotIndex: number,
    data: string,
    metadata: SaveMetadata
  ): void {
    if (typeof localStorage === 'undefined') return;
    
    const key = `${this.config.storageKey}_${slotIndex}`;
    localStorage.setItem(key, data);
  }
  
  private generateSaveId(): string {
    return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // ============================================================================
  // LOAD OPERATIONS
  // ============================================================================
  
  async load(slotIndex: number): Promise<GameState> {
    if (this.status !== 'idle') {
      throw new Error('Operation already in progress');
    }
    
    const slot = this.slots[slotIndex];
    if (!slot.occupied || !slot.metadata) {
      throw new Error('Slot is empty');
    }
    
    this.status = 'loading';
    this.emit('loadStarted', { slotIndex });
    
    try {
      const data = this.loadFromStorage(slotIndex);
      if (!data) {
        throw new Error('Failed to read save data');
      }
      
      let state = this.serializer.deserialize(data);
      
      // Validate structure
      if (!SaveValidator.validateStructure(state)) {
        throw new Error('Save data is corrupted');
      }
      
      // Migrate if needed
      if (slot.metadata.version < this.config.saveVersion) {
        if (this.migrator.hasPath(slot.metadata.version, this.config.saveVersion)) {
          state = this.migrator.migrate(
            state,
            slot.metadata.version,
            this.config.saveVersion
          );
        } else {
          console.warn('No migration path available, loading as-is');
        }
      }
      
      // Validate checksum
      const checksum = SaveValidator.generateChecksum(state);
      if (checksum !== slot.metadata.checksum) {
        console.warn('Checksum mismatch, save may be corrupted');
        this.emit('checksumMismatch', { slotIndex, expected: slot.metadata.checksum, actual: checksum });
      }
      
      this.currentState = state;
      this.totalPlayTime = slot.metadata.playTime;
      this.sessionStartTime = Date.now();
      
      this.status = 'idle';
      this.emit('loadComplete', state);
      
      return state;
    } catch (error) {
      this.status = 'error';
      this.emit('loadError', error);
      throw error;
    }
  }
  
  async quickLoad(): Promise<GameState> {
    return this.load(this.config.quicksaveSlot);
  }
  
  private loadFromStorage(slotIndex: number): string | null {
    if (typeof localStorage === 'undefined') return null;
    
    const key = `${this.config.storageKey}_${slotIndex}`;
    return localStorage.getItem(key);
  }
  
  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================
  
  async deleteSave(slotIndex: number): Promise<void> {
    const slot = this.slots[slotIndex];
    if (!slot.occupied) return;
    
    if (slot.locked) {
      throw new Error('Slot is locked');
    }
    
    // Remove from storage
    if (typeof localStorage !== 'undefined') {
      const key = `${this.config.storageKey}_${slotIndex}`;
      localStorage.removeItem(key);
    }
    
    // Cloud delete
    if (this.cloudProvider && slot.metadata) {
      try {
        await this.cloudProvider.delete(slot.metadata.id);
      } catch (error) {
        console.warn('Cloud delete failed:', error);
      }
    }
    
    // Update slot
    this.slots[slotIndex] = {
      index: slotIndex,
      occupied: false,
      locked: false,
    };
    
    this.saveSaveIndex();
    this.emit('saveDeleted', { slotIndex });
  }
  
  async deleteAllSaves(): Promise<void> {
    for (let i = 0; i < this.config.maxSlots; i++) {
      if (this.slots[i].occupied && !this.slots[i].locked) {
        await this.deleteSave(i);
      }
    }
  }
  
  // ============================================================================
  // EXPORT/IMPORT
  // ============================================================================
  
  async exportSave(slotIndex: number): Promise<Blob> {
    const slot = this.slots[slotIndex];
    if (!slot.occupied || !slot.metadata) {
      throw new Error('Slot is empty');
    }
    
    const data = this.loadFromStorage(slotIndex);
    if (!data) {
      throw new Error('Failed to read save data');
    }
    
    const state = this.serializer.deserialize(data);
    const exportData: SaveData = {
      metadata: slot.metadata,
      state,
    };
    
    const json = JSON.stringify(exportData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }
  
  async importSave(file: File, slotIndex: number): Promise<void> {
    const text = await file.text();
    const data: SaveData = JSON.parse(text);
    
    if (!SaveValidator.validateStructure(data.state)) {
      throw new Error('Invalid save file structure');
    }
    
    // Update metadata
    data.metadata.slotIndex = slotIndex;
    data.metadata.modifiedAt = Date.now();
    
    // Serialize and save
    const serialized = this.serializer.serialize(data.state);
    this.saveToStorage(slotIndex, serialized, data.metadata);
    
    // Update slot
    this.slots[slotIndex] = {
      index: slotIndex,
      occupied: true,
      metadata: data.metadata,
      locked: false,
    };
    
    this.saveSaveIndex();
    this.emit('saveImported', { slotIndex, metadata: data.metadata });
  }
  
  // ============================================================================
  // AUTOSAVE MANAGEMENT
  // ============================================================================
  
  startAutosave(): void {
    if (this.autosaveTimer) return;
    
    this.autosaveTimer = setInterval(() => {
      this.autoSave();
    }, this.config.autosaveInterval * 1000);
    
    this.emit('autosaveStarted');
  }
  
  stopAutosave(): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
      this.emit('autosaveStopped');
    }
  }
  
  setAutosaveInterval(seconds: number): void {
    this.config.autosaveInterval = seconds;
    
    if (this.autosaveTimer) {
      this.stopAutosave();
      this.startAutosave();
    }
  }
  
  // ============================================================================
  // SLOT MANAGEMENT
  // ============================================================================
  
  getSlots(): SaveSlot[] {
    return [...this.slots];
  }
  
  getSlot(index: number): SaveSlot | undefined {
    return this.slots[index];
  }
  
  getOccupiedSlots(): SaveSlot[] {
    return this.slots.filter(s => s.occupied);
  }
  
  getEmptySlots(): SaveSlot[] {
    return this.slots.filter(s => !s.occupied);
  }
  
  lockSlot(index: number): void {
    if (this.slots[index]) {
      this.slots[index].locked = true;
      this.emit('slotLocked', index);
    }
  }
  
  unlockSlot(index: number): void {
    if (this.slots[index]) {
      this.slots[index].locked = false;
      this.emit('slotUnlocked', index);
    }
  }
  
  // ============================================================================
  // CLOUD SYNC
  // ============================================================================
  
  setCloudProvider(provider: CloudProvider): void {
    this.cloudProvider = provider;
    this.emit('cloudProviderSet', provider.name);
  }
  
  async syncWithCloud(): Promise<void> {
    if (!this.cloudProvider || !this.config.cloudSyncEnabled) return;
    
    this.status = 'syncing';
    this.emit('cloudSyncStarted');
    
    try {
      await this.cloudProvider.sync();
      
      const cloudSaves = await this.cloudProvider.list();
      
      // Merge cloud saves with local
      for (const cloudMeta of cloudSaves) {
        const localSlot = this.slots[cloudMeta.slotIndex];
        
        if (!localSlot.occupied || 
            (localSlot.metadata && cloudMeta.modifiedAt > localSlot.metadata.modifiedAt)) {
          // Cloud is newer, download
          const cloudData = await this.cloudProvider.download(cloudMeta.id);
          const serialized = this.serializer.serialize(cloudData.state);
          this.saveToStorage(cloudMeta.slotIndex, serialized, cloudMeta);
          
          this.slots[cloudMeta.slotIndex] = {
            index: cloudMeta.slotIndex,
            occupied: true,
            metadata: cloudMeta,
            locked: false,
          };
        }
      }
      
      this.saveSaveIndex();
      this.status = 'idle';
      this.emit('cloudSyncComplete');
    } catch (error) {
      this.status = 'error';
      this.emit('cloudSyncError', error);
      throw error;
    }
  }
  
  // ============================================================================
  // STATE & UTILITIES
  // ============================================================================
  
  getStatus(): SaveStatus {
    return this.status;
  }
  
  getSessionPlayTime(): number {
    return (Date.now() - this.sessionStartTime) / 1000;
  }
  
  getTotalPlayTime(): number {
    return this.totalPlayTime + this.getSessionPlayTime();
  }
  
  getCurrentState(): GameState | null {
    return this.currentState;
  }
  
  setCurrentState(state: GameState): void {
    this.currentState = state;
  }
  
  getConfig(): SaveManagerConfig {
    return { ...this.config };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stopAutosave();
    this.removeAllListeners();
    this.stateProviders.clear();
    SaveManager.instance = null;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

interface SaveContextValue {
  manager: SaveManager;
}

const SaveContext = createContext<SaveContextValue | null>(null);

export function SaveProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<SaveManagerConfig>;
}) {
  const value = useMemo(() => ({
    manager: new SaveManager(config),
  }), [config]);
  
  useEffect(() => {
    if (value.manager.getConfig().autosaveEnabled) {
      value.manager.startAutosave();
    }
    
    return () => {
      value.manager.dispose();
    };
  }, [value]);
  
  return (
    <SaveContext.Provider value={value}>
      {children}
    </SaveContext.Provider>
  );
}

export function useSaveManager() {
  const context = useContext(SaveContext);
  if (!context) {
    return SaveManager.getInstance();
  }
  return context.manager;
}

export function useSaveSlots() {
  const manager = useSaveManager();
  const [slots, setSlots] = useState<SaveSlot[]>(manager.getSlots());
  
  useEffect(() => {
    const update = () => setSlots(manager.getSlots());
    
    manager.on('saveComplete', update);
    manager.on('saveDeleted', update);
    manager.on('saveImported', update);
    manager.on('savesLoaded', update);
    
    return () => {
      manager.off('saveComplete', update);
      manager.off('saveDeleted', update);
      manager.off('saveImported', update);
      manager.off('savesLoaded', update);
    };
  }, [manager]);
  
  return slots;
}

export function useSaveStatus() {
  const manager = useSaveManager();
  const [status, setStatus] = useState<SaveStatus>(manager.getStatus());
  
  useEffect(() => {
    const updateStatus = () => setStatus(manager.getStatus());
    
    manager.on('saveStarted', updateStatus);
    manager.on('saveComplete', updateStatus);
    manager.on('saveError', updateStatus);
    manager.on('loadStarted', updateStatus);
    manager.on('loadComplete', updateStatus);
    manager.on('loadError', updateStatus);
    
    return () => {
      manager.off('saveStarted', updateStatus);
      manager.off('saveComplete', updateStatus);
      manager.off('saveError', updateStatus);
      manager.off('loadStarted', updateStatus);
      manager.off('loadComplete', updateStatus);
      manager.off('loadError', updateStatus);
    };
  }, [manager]);
  
  return status;
}

export function useSaveOperations() {
  const manager = useSaveManager();
  
  const save = useCallback(async (
    slotIndex: number,
    name: string,
    type?: SaveType,
    thumbnail?: string
  ) => {
    return manager.save(slotIndex, name, type, thumbnail);
  }, [manager]);
  
  const load = useCallback(async (slotIndex: number) => {
    return manager.load(slotIndex);
  }, [manager]);
  
  const quickSave = useCallback(() => manager.quickSave(), [manager]);
  const quickLoad = useCallback(() => manager.quickLoad(), [manager]);
  
  const deleteSave = useCallback(async (slotIndex: number) => {
    return manager.deleteSave(slotIndex);
  }, [manager]);
  
  return { save, load, quickSave, quickLoad, deleteSave };
}

export function usePlayTime() {
  const manager = useSaveManager();
  const [playTime, setPlayTime] = useState(manager.getTotalPlayTime());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayTime(manager.getTotalPlayTime());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [manager]);
  
  return playTime;
}

const __defaultExport = {
  SaveManager,
  JSONSerializer,
  CompressedSerializer,
  SaveMigrator,
  SaveValidator,
  SaveProvider,
  useSaveManager,
  useSaveSlots,
  useSaveStatus,
  useSaveOperations,
  usePlayTime,
};

export default __defaultExport;
