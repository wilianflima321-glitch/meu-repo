/**
 * Save Manager - split persistence runtime.
 *
 * Save serialization, validation, cloud sync, and React hooks are separated so
 * Studio can lazy-load persistence features without bloating initial shells.
 */

import { logger } from '@/lib/observability/logger';
import { EventEmitter } from 'events';
import { CompressedSerializer, JSONSerializer } from './serializers';
import {
  createDefaultPlayerState,
  createDefaultSettings,
  createDefaultStatistics,
  createDefaultWorldState,
} from './defaults';
import {
  deleteSaveSlot,
  loadSaveIndex,
  readSaveSlot,
  saveSaveIndex,
  writeSaveSlot,
} from './local-storage';
import { SaveMigrator } from './migration';
import { SaveValidator } from './validator';
import type { CloudProvider, GameState, SaveData, SaveManagerConfig, SaveMetadata, SaveSerializer, SaveSlot, SaveStatus, SaveType } from './types';

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
    
    this.initializeSlots();
    
    this.loadSavesFromStorage();
  }
  
  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }
  
  
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
    try {
      for (const metadata of loadSaveIndex(this.config.storageKey)) {
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
      logger.error('Failed to load save index:', error);
    }
  }
  
  private saveSaveIndex(): void {
    saveSaveIndex(this.config.storageKey, this.slots
      .filter(s => s.occupied && s.metadata)
      .map(s => s.metadata));
  }
  
  
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
        logger.warn(`State provider ${key} failed:`, error);
      }
    }
    
    if (this.currentState) {
      return {
        ...this.currentState,
        custom: { ...this.currentState.custom, ...custom },
      };
    }
    
    return {
      player: createDefaultPlayerState(),
      world: createDefaultWorldState(),
      quests: [],
      inventory: { items: [], currency: {}, capacity: 100 },
      settings: createDefaultSettings(),
      statistics: createDefaultStatistics(),
      custom,
    };
  }
  
  
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
      
      this.saveToStorage(slotIndex, serialized, metadata);
      
      this.slots[slotIndex] = {
        index: slotIndex,
        occupied: true,
        metadata,
        locked: false,
      };
      
      this.saveSaveIndex();
      
      if (this.config.cloudSyncEnabled && this.cloudProvider) {
        try {
          await this.cloudProvider.upload(saveData);
        } catch (cloudError) {
          logger.warn('Cloud sync failed:', cloudError);
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
      logger.error('Autosave failed:', error);
      return null;
    }
  }
  
  private findNextAutosaveSlot(): number {
    const autosaves = this.slots
      .filter(s => s.occupied && s.metadata?.type === 'autosave')
      .sort((a, b) => (a.metadata?.modifiedAt || 0) - (b.metadata?.modifiedAt || 0));
    
    if (autosaves.length >= this.config.maxAutosaves) {
      return autosaves[0].index;
    }
    
    for (let i = this.config.maxSlots - 1; i >= 0; i--) {
      if (!this.slots[i].occupied) {
        return i;
      }
    }
    
    return autosaves[0]?.index || this.config.maxSlots - 1;
  }
  
  private saveToStorage(
    slotIndex: number,
    data: string,
    metadata: SaveMetadata
  ): void {
    writeSaveSlot(this.config.storageKey, slotIndex, data);
  }
  
  private generateSaveId(): string {
    return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  
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
      
      if (!SaveValidator.validateStructure(state)) {
        throw new Error('Save data is corrupted');
      }
      
      if (slot.metadata.version < this.config.saveVersion) {
        if (this.migrator.hasPath(slot.metadata.version, this.config.saveVersion)) {
          state = this.migrator.migrate(
            state,
            slot.metadata.version,
            this.config.saveVersion
          );
        } else {
          logger.warn('No migration path available, loading as-is');
        }
      }
      
      const checksum = SaveValidator.generateChecksum(state);
      if (checksum !== slot.metadata.checksum) {
        logger.warn('Checksum mismatch, save may be corrupted');
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
    return readSaveSlot(this.config.storageKey, slotIndex);
  }
  
  
  async deleteSave(slotIndex: number): Promise<void> {
    const slot = this.slots[slotIndex];
    if (!slot.occupied) return;
    
    if (slot.locked) {
      throw new Error('Slot is locked');
    }
    
    deleteSaveSlot(this.config.storageKey, slotIndex);
    
    if (this.cloudProvider && slot.metadata) {
      try {
        await this.cloudProvider.delete(slot.metadata.id);
      } catch (error) {
        logger.warn('Cloud delete failed:', error);
      }
    }
    
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
    
    data.metadata.slotIndex = slotIndex;
    data.metadata.modifiedAt = Date.now();
    
    const serialized = this.serializer.serialize(data.state);
    this.saveToStorage(slotIndex, serialized, data.metadata);
    
    this.slots[slotIndex] = {
      index: slotIndex,
      occupied: true,
      metadata: data.metadata,
      locked: false,
    };
    
    this.saveSaveIndex();
    this.emit('saveImported', { slotIndex, metadata: data.metadata });
  }
  
  
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
      
      for (const cloudMeta of cloudSaves) {
        const localSlot = this.slots[cloudMeta.slotIndex];
        
        if (!localSlot.occupied || 
            (localSlot.metadata && cloudMeta.modifiedAt > localSlot.metadata.modifiedAt)) {
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
  
  
  dispose(): void {
    this.stopAutosave();
    this.removeAllListeners();
    this.stateProviders.clear();
    SaveManager.instance = null;
  }
}
