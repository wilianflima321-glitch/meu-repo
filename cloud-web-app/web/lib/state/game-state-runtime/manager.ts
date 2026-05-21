/**
 * Game State Manager - split persistence runtime.
 *
 * This keeps save/load, migration, compression, and React bindings isolated so
 * editor shells can load only the state surface they need.
 */

import { EventEmitter } from 'events';
import { Checksum } from './checksum';
import { Compressor } from './compressor';
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
    
    const metadata: SaveMetadata = {
      id: `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      slotIndex,
      version: 1,
      timestamp: Date.now(),
      playTime: this.getPlayTime(),
      thumbnail,
      location: this.currentGameState.world.currentScene,
      playerLevel: this.currentGameState.player.level,
    };
    
    const saveData: SaveData = {
      metadata,
      gameState: this.currentGameState,
      compressed: true,
      checksum: '',
    };
    
    // Serialize and compress
    const serialized = JSON.stringify({
      metadata: saveData.metadata,
      gameState: this.serializeGameState(saveData.gameState),
    });
    
    const compressed = await Compressor.compress(serialized);
    saveData.checksum = Checksum.calculate(compressed);
    
    const finalData = JSON.stringify({
      compressed: true,
      checksum: saveData.checksum,
      data: compressed,
    });
    
    await this.storage.save(`slot_${slotIndex}`, finalData);
    
    this.emit('saved', { metadata, slotIndex });
    
    return metadata;
  }
  
  async load(slotIndex: number): Promise<GameState> {
    const rawData = await this.storage.load(`slot_${slotIndex}`);
    
    if (!rawData) {
      throw new Error(`No save data found in slot ${slotIndex}`);
    }
    
    const parsed = JSON.parse(rawData);
    
    // Verify checksum
    if (!Checksum.verify(parsed.data, parsed.checksum)) {
      throw new Error('Save data corrupted - checksum mismatch');
    }
    
    // Decompress
    const decompressed = await Compressor.decompress(parsed.data);
    const saveData = JSON.parse(decompressed);
    
    // Deserialize game state
    let gameState = this.deserializeGameState(saveData.gameState);
    
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
          const parsed = JSON.parse(rawData);
          const decompressed = await Compressor.decompress(parsed.data);
          const saveData = JSON.parse(decompressed);
          
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
      const parsed = JSON.parse(rawData);
      const decompressed = await Compressor.decompress(parsed.data);
      const saveData = JSON.parse(decompressed);
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
    
    const checkpoint = this.cloneGameState(this.currentGameState);
    this.checkpoints.set(id, checkpoint);
    
    this.emit('checkpointCreated', { id });
  }
  
  loadCheckpoint(id: string): GameState | null {
    const checkpoint = this.checkpoints.get(id);
    
    if (checkpoint) {
      this.currentGameState = this.cloneGameState(checkpoint);
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
    this.currentGameState = this.createDefaultGameState();
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
  // SERIALIZATION
  // ============================================================================
  
  private serializeGameState(state: GameState): unknown {
    return {
      ...state,
      customSections: Object.fromEntries(state.customSections),
    };
  }
  
  private deserializeGameState(data: unknown): GameState {
    const parsed = data as any;
    
    return {
      ...parsed,
      customSections: new Map(Object.entries(parsed.customSections || {})),
    };
  }
  
  private cloneGameState(state: GameState): GameState {
    return JSON.parse(JSON.stringify({
      ...state,
      customSections: Object.fromEntries(state.customSections),
    }));
  }
  
  private createDefaultGameState(): GameState {
    return {
      version: this.currentVersion,
      player: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        stamina: 100,
        maxStamina: 100,
        experience: 0,
        level: 1,
        stats: {
          strength: 10,
          dexterity: 10,
          intelligence: 10,
          vitality: 10,
        },
        skills: {},
        buffs: [],
        equipment: {},
      },
      world: {
        currentScene: 'starting_area',
        discoveredLocations: ['starting_area'],
        unlockedAreas: ['starting_area'],
        worldTime: 0,
        entities: [],
        destructibles: {},
        switches: {},
        doors: {},
        npcs: {},
      },
      inventory: {
        items: [],
        currency: { gold: 0, gems: 0 },
        maxSlots: 30,
        equippedItems: {},
      },
      quests: {
        activeQuests: [],
        completedQuests: [],
        failedQuests: [],
        questVariables: {},
      },
      settings: {
        difficulty: 'normal',
        language: 'en',
        subtitles: true,
        hints: true,
      },
      customSections: new Map(),
    };
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
      const parsed = JSON.parse(data);
      
      if (!parsed.data || !parsed.checksum) {
        throw new Error('Invalid save data format');
      }
      
      if (!Checksum.verify(parsed.data, parsed.checksum)) {
        throw new Error('Save data corrupted');
      }
      
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
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  async uploadSave(slotIndex: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sav,.json';
      
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        try {
          const data = await file.text();
          await this.importSave(slotIndex, data);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      input.click();
    });
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
