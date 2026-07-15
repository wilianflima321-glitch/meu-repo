/**
 * Game State Manager - split persistence runtime.
 *
 * This keeps save/load, migration, compression, and React bindings isolated so
 * editor shells can load only the state surface they need.
 */

import { EventEmitter } from 'events';
import { downloadSaveData, readUploadedSaveFile } from './browser-transfer';
import { createDefaultGameState } from './default-state';
import { cloneGameState } from './serialization';
import { createSaveMetadata, packSaveData, unpackSaveData, validatePackedSaveData } from './save-packaging';
import { IndexedDBAdapter } from './storage-adapters';
import type { AutoSaveConfig, GameState, MigrationFunction, SaveData, SaveMetadata, SaveSlot, StorageAdapter } from './types';

export class GameStateManager extends EventEmitter {
  private storage: StorageAdapter;
  private currentGameState: GameState | null = null;
  private maxSlots: number;
  private autoSaveConfig: AutoSaveConfig;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private playTimeStart: number = 0;
  private migrations: MigrationFunction[] = [];
  private currentVersion: string;
  
  constructor(options: {
    storage?: StorageAdapter;
    maxSlots?: number;
    autoSave?: Partial<AutoSaveConfig>;
    version?: string;
  } = {}) {
    super();
    
    this.storage = options.storage || new IndexedDBAdapter();
    this.maxSlots = options.maxSlots || 10;
    this.currentVersion = options.version || '1.0.0';
    
    this.autoSaveConfig = {
      enabled: true,
      intervalMinutes: 5,
      maxAutoSaves: 3,
      saveOnSceneChange: true,
      saveOnQuestComplete: true,
      ...options.autoSave,
    };
    
    this.startPlayTimeTracking();
  }
  
  // ============================================================================
  // SAVE OPERATIONS
  // ============================================================================
  
  async save(slotIndex: number, name: string, thumbnail?: string): Promise<SaveMetadata> {
    if (!this.currentGameState) {
      throw new Error('No game state to save');
    }
    
    const metadata = createSaveMetadata({
      slotIndex,
      name,
      playTime: this.getPlayTime(),
      gameState: this.currentGameState,
      thumbnail,
    });
    
    const saveData: SaveData = {
      metadata,
      gameState: this.currentGameState,
      compressed: true,
      checksum: '',
    };
    
    const finalData = await packSaveData(saveData);
    await this.storage.save(`slot_${slotIndex}`, finalData);
    
    this.emit('saved', { metadata, slotIndex });
    
    return metadata;
  }
  
  async load(slotIndex: number): Promise<GameState> {
    const rawData = await this.storage.load(`slot_${slotIndex}`);
    
    if (!rawData) {
      throw new Error(`No save data found in slot ${slotIndex}`);
    }
    
    const saveData = await unpackSaveData(rawData);
    let gameState = saveData.gameState;
    
    // Apply migrations if needed
    gameState = this.migrateState(gameState);
    
    this.currentGameState = gameState;
    this.playTimeStart = Date.now() - saveData.metadata.playTime;
    
    this.emit('loaded', { metadata: saveData.metadata, slotIndex });
    
    return gameState;
  }
  
  async deleteSave(slotIndex: number): Promise<void> {
    await this.storage.delete(`slot_${slotIndex}`);
    this.emit('deleted', { slotIndex });
  }
  
  async getSlots(): Promise<SaveSlot[]> {
    const slots: SaveSlot[] = [];
    
    for (let i = 0; i < this.maxSlots; i++) {
      const rawData = await this.storage.load(`slot_${i}`);
      
      if (rawData) {
        try {
          const saveData = await unpackSaveData(rawData);
          
          slots.push({
            index: i,
            isEmpty: false,
            metadata: saveData.metadata,
          });
        } catch {
          slots.push({ index: i, isEmpty: true });
        }
      } else {
        slots.push({ index: i, isEmpty: true });
      }
    }
    
    return slots;
  }
  
  async getSlotMetadata(slotIndex: number): Promise<SaveMetadata | null> {
    const rawData = await this.storage.load(`slot_${slotIndex}`);
    
    if (!rawData) return null;
    
    try {
      const saveData = await unpackSaveData(rawData);
      return saveData.metadata;
    } catch {
      return null;
    }
  }
  
  // ============================================================================
  // AUTO-SAVE
  // ============================================================================
  
  startAutoSave(): void {
    if (!this.autoSaveConfig.enabled) return;
    
    this.stopAutoSave();
    
    const intervalMs = this.autoSaveConfig.intervalMinutes * 60 * 1000;
    
    this.autoSaveTimer = setInterval(async () => {
      await this.autoSave();
    }, intervalMs);
    
    this.emit('autoSaveStarted');
  }
  
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.emit('autoSaveStopped');
    }
  }
  
  async autoSave(): Promise<void> {
    if (!this.currentGameState) return;
    
    try {
      // Find auto-save slot
      const autoSaveSlots = await this.getAutoSaveSlots();
      let slotIndex: number;
      
      if (autoSaveSlots.length < this.autoSaveConfig.maxAutoSaves) {
        slotIndex = this.maxSlots + autoSaveSlots.length; // Use slots after normal slots
      } else {
        // Overwrite oldest auto-save
        autoSaveSlots.sort((a, b) => a.timestamp - b.timestamp);
        slotIndex = autoSaveSlots[0].slotIndex;
      }
      
      await this.save(slotIndex, `Auto-Save ${new Date().toLocaleString()}`);
      
      this.emit('autoSaved', { slotIndex });
    } catch (error) {
      this.emit('autoSaveError', { error });
    }
  }
  
  private async getAutoSaveSlots(): Promise<SaveMetadata[]> {
    const autoSaves: SaveMetadata[] = [];
    
    for (let i = this.maxSlots; i < this.maxSlots + this.autoSaveConfig.maxAutoSaves; i++) {
      const metadata = await this.getSlotMetadata(i);
      if (metadata) {
        autoSaves.push(metadata);
      }
    }
    
    return autoSaves;
  }
  
  // ============================================================================
  // CHECKPOINTS
  // ============================================================================
  
  private checkpoints: Map<string, GameState> = new Map();
  
  createCheckpoint(id: string): void {
    if (!this.currentGameState) return;
    
    const checkpoint = cloneGameState(this.currentGameState);
    this.checkpoints.set(id, checkpoint);
    
    this.emit('checkpointCreated', { id });
  }
  
  loadCheckpoint(id: string): GameState | null {
    const checkpoint = this.checkpoints.get(id);
    
    if (checkpoint) {
      this.currentGameState = cloneGameState(checkpoint);
      this.emit('checkpointLoaded', { id });
      return this.currentGameState;
    }
    
    return null;
  }
  
  deleteCheckpoint(id: string): void {
    this.checkpoints.delete(id);
    this.emit('checkpointDeleted', { id });
  }
  
  clearCheckpoints(): void {
    this.checkpoints.clear();
    this.emit('checkpointsCleared');
  }
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  newGame(): GameState {
    this.currentGameState = createDefaultGameState(this.currentVersion);
    this.playTimeStart = Date.now();
    
    this.emit('newGame', { gameState: this.currentGameState });
    
    return this.currentGameState;
  }
  
  getCurrentState(): GameState | null {
    return this.currentGameState;
  }
  
  updateState(updater: (state: GameState) => void): void {
    if (!this.currentGameState) return;
    
    updater(this.currentGameState);
    this.emit('stateUpdated', { gameState: this.currentGameState });
  }
  
  setPlayerPosition(x: number, y: number, z: number): void {
    this.updateState((state) => {
      state.player.position = { x, y, z };
    });
  }
  
  setPlayerHealth(health: number): void {
    this.updateState((state) => {
      state.player.health = Math.max(0, Math.min(state.player.maxHealth, health));
    });
  }
  
  addItem(itemId: string, quantity = 1): void {
    this.updateState((state) => {
      const existing = state.inventory.items.find((i) => i.itemId === itemId);
      
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.inventory.items.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemId,
          quantity,
        });
      }
    });
  }
  
  removeItem(itemId: string, quantity = 1): boolean {
    let removed = false;
    
    this.updateState((state) => {
      const index = state.inventory.items.findIndex((i) => i.itemId === itemId);
      
      if (index !== -1) {
        const item = state.inventory.items[index];
        item.quantity -= quantity;
        
        if (item.quantity <= 0) {
          state.inventory.items.splice(index, 1);
        }
        
        removed = true;
      }
    });
    
    return removed;
  }
  
  startQuest(questId: string): void {
    this.updateState((state) => {
      if (!state.quests.activeQuests.find((q) => q.id === questId)) {
        state.quests.activeQuests.push({
          id: questId,
          currentObjective: 0,
          objectivesCompleted: [],
          startTime: Date.now(),
        });
        
        if (this.autoSaveConfig.saveOnQuestComplete) {
          this.autoSave();
        }
      }
    });
  }
  
  completeQuest(questId: string): void {
    this.updateState((state) => {
      const index = state.quests.activeQuests.findIndex((q) => q.id === questId);
      
      if (index !== -1) {
        state.quests.activeQuests.splice(index, 1);
        state.quests.completedQuests.push(questId);
        
        if (this.autoSaveConfig.saveOnQuestComplete) {
          this.autoSave();
        }
      }
    });
  }
  
  changeScene(sceneId: string): void {
    this.updateState((state) => {
      state.world.currentScene = sceneId;
      
      if (!state.world.discoveredLocations.includes(sceneId)) {
        state.world.discoveredLocations.push(sceneId);
      }
    });
    
    if (this.autoSaveConfig.saveOnSceneChange) {
      this.autoSave();
    }
  }
  
  // ============================================================================
  // PLAY TIME
  // ============================================================================
  
  private startPlayTimeTracking(): void {
    this.playTimeStart = Date.now();
  }
  
  getPlayTime(): number {
    return Date.now() - this.playTimeStart;
  }
  
  getFormattedPlayTime(): string {
    const ms = this.getPlayTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    const s = seconds % 60;
    const m = minutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  
  // ============================================================================
  // MIGRATIONS
  // ============================================================================
  
  registerMigration(migration: MigrationFunction): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => 
      this.compareVersions(a.fromVersion, b.fromVersion)
    );
  }
  
  private migrateState(state: GameState): GameState {
    let currentVersion = state.version;
    
    for (const migration of this.migrations) {
      if (this.compareVersions(currentVersion, migration.fromVersion) === 0) {
        state = migration.migrate(state);
        currentVersion = migration.toVersion;
        state.version = currentVersion;
      }
    }
    
    return state;
  }
  
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      
      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }
    
    return 0;
  }
  
  // ============================================================================
  // EXPORT/IMPORT
  // ============================================================================
  
  async exportSave(slotIndex: number): Promise<string> {
    const rawData = await this.storage.load(`slot_${slotIndex}`);
    
    if (!rawData) {
      throw new Error(`No save data found in slot ${slotIndex}`);
    }
    
    return rawData;
  }
  
  async importSave(slotIndex: number, data: string): Promise<void> {
    // Validate data
    try {
      validatePackedSaveData(data);
      await this.storage.save(`slot_${slotIndex}`, data);
      
      this.emit('imported', { slotIndex });
    } catch (error) {
      throw new Error(`Failed to import save: ${(error as Error).message}`);
    }
  }
  
  async downloadSave(slotIndex: number): Promise<void> {
    const data = await this.exportSave(slotIndex);
    const metadata = await this.getSlotMetadata(slotIndex);
    const filename = `save_${metadata?.name || slotIndex}_${Date.now()}.sav`;
    
    downloadSaveData({ data, filename });
  }
  
  async uploadSave(slotIndex: number): Promise<void> {
    const data = await readUploadedSaveFile();
    await this.importSave(slotIndex, data);
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stopAutoSave();
    this.checkpoints.clear();
    this.currentGameState = null;
    this.removeAllListeners();
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================
