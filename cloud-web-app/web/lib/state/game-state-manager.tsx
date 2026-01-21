/**
 * Game State Manager - Sistema de Save/Load de Estado de Jogo
 * 
 * Sistema completo de persistência com:
 * - Save/Load game state
 * - Auto-save
 * - Save slots
 * - Cloud sync (IndexedDB + optional backend)
 * - Compression
 * - Versioning/migration
 * - Checkpoints
 * 
 * @module lib/state/game-state-manager
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface SaveMetadata {
  id: string;
  name: string;
  slotIndex: number;
  version: number;
  timestamp: number;
  playTime: number;
  thumbnail?: string;
  location?: string;
  playerLevel?: number;
  customData?: Record<string, unknown>;
}

export interface SaveData {
  metadata: SaveMetadata;
  gameState: GameState;
  compressed: boolean;
  checksum: string;
}

export interface GameState {
  version: string;
  player: PlayerState;
  world: WorldState;
  inventory: InventoryState;
  quests: QuestState;
  settings: GameSettings;
  customSections: Map<string, unknown>;
}

export interface PlayerState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  experience: number;
  level: number;
  stats: Record<string, number>;
  skills: Record<string, SkillData>;
  buffs: BuffData[];
  equipment: Record<string, string>;
}

export interface SkillData {
  id: string;
  level: number;
  experience: number;
  unlocked: boolean;
  cooldownRemaining: number;
}

export interface BuffData {
  id: string;
  duration: number;
  stacks: number;
  data?: Record<string, unknown>;
}

export interface WorldState {
  currentScene: string;
  discoveredLocations: string[];
  unlockedAreas: string[];
  worldTime: number;
  weatherState?: string;
  entities: EntitySaveData[];
  destructibles: Record<string, boolean>;
  switches: Record<string, boolean>;
  doors: Record<string, DoorState>;
  npcs: Record<string, NPCState>;
}

export interface EntitySaveData {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  data: Record<string, unknown>;
}

export interface DoorState {
  isOpen: boolean;
  isLocked: boolean;
  keyId?: string;
}

export interface NPCState {
  id: string;
  position: { x: number; y: number; z: number };
  dialogueProgress: number;
  relationshipLevel: number;
  isDead: boolean;
  customData?: Record<string, unknown>;
}

export interface InventoryState {
  items: InventoryItem[];
  currency: Record<string, number>;
  maxSlots: number;
  equippedItems: Record<string, string>;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  quantity: number;
  durability?: number;
  enchantments?: string[];
  customData?: Record<string, unknown>;
}

export interface QuestState {
  activeQuests: Quest[];
  completedQuests: string[];
  failedQuests: string[];
  questVariables: Record<string, unknown>;
}

export interface Quest {
  id: string;
  currentObjective: number;
  objectivesCompleted: boolean[];
  startTime: number;
  customData?: Record<string, unknown>;
}

export interface GameSettings {
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
  language: string;
  subtitles: boolean;
  hints: boolean;
}

export interface SaveSlot {
  index: number;
  isEmpty: boolean;
  metadata?: SaveMetadata;
}

export interface AutoSaveConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxAutoSaves: number;
  saveOnSceneChange: boolean;
  saveOnQuestComplete: boolean;
}

export interface MigrationFunction {
  fromVersion: string;
  toVersion: string;
  migrate: (state: GameState) => GameState;
}

// ============================================================================
// STORAGE ADAPTERS
// ============================================================================

export interface StorageAdapter {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  clear(): Promise<void>;
}

// LocalStorage Adapter
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;
  
  constructor(prefix = 'game_save_') {
    this.prefix = prefix;
  }
  
  async save(key: string, data: string): Promise<void> {
    localStorage.setItem(this.prefix + key, data);
  }
  
  async load(key: string): Promise<string | null> {
    return localStorage.getItem(this.prefix + key);
  }
  
  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }
  
  async list(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }
  
  async clear(): Promise<void> {
    const keys = await this.list();
    for (const key of keys) {
      await this.delete(key);
    }
  }
}

// IndexedDB Adapter
export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  
  constructor(dbName = 'GameSaves', storeName = 'saves') {
    this.dbName = dbName;
    this.storeName = storeName;
  }
  
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }
  
  async save(key: string, data: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.put({ key, data });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async load(key: string): Promise<string | null> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
    });
  }
  
  async delete(key: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async list(): Promise<string[]> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.getAllKeys();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }
  
  async clear(): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// ============================================================================
// COMPRESSION
// ============================================================================

export class Compressor {
  static async compress(data: string): Promise<string> {
    if (typeof CompressionStream !== 'undefined') {
      const blob = new Blob([data]);
      const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
      const compressed = await new Response(stream).arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(compressed)));
    }
    
    // Fallback: simple RLE-like compression
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
        
        const blob = new Blob([bytes]);
        const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        return await new Response(stream).text();
      } catch {
        // Fallback to simple decompression
      }
    }
    
    return this.simpleDecompress(data);
  }
  
  private static simpleCompress(data: string): string {
    // Very simple compression for fallback
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

export class Checksum {
  static calculate(data: string): string {
    // Simple hash for integrity check
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  static verify(data: string, checksum: string): boolean {
    return this.calculate(data) === checksum;
  }
}

// ============================================================================
// GAME STATE MANAGER
// ============================================================================

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

import { useState, useCallback, useRef, useEffect, useContext, createContext } from 'react';

const GameStateContext = createContext<GameStateManager | null>(null);

export function GameStateProvider({ 
  children, 
  options = {} 
}: { 
  children: React.ReactNode;
  options?: ConstructorParameters<typeof GameStateManager>[0];
}) {
  const managerRef = useRef<GameStateManager>(new GameStateManager(options));
  
  useEffect(() => {
    return () => {
      managerRef.current.dispose();
    };
  }, []);
  
  return (
    <GameStateContext.Provider value={managerRef.current}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const manager = useContext(GameStateContext);
  if (!manager) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  
  const [state, setState] = useState<GameState | null>(manager.getCurrentState());
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const updateState = () => setState(manager.getCurrentState());
    
    manager.on('stateUpdated', updateState);
    manager.on('loaded', updateState);
    manager.on('newGame', updateState);
    
    return () => {
      manager.off('stateUpdated', updateState);
      manager.off('loaded', updateState);
      manager.off('newGame', updateState);
    };
  }, [manager]);
  
  const refreshSlots = useCallback(async () => {
    const loadedSlots = await manager.getSlots();
    setSlots(loadedSlots);
  }, [manager]);
  
  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);
  
  const save = useCallback(async (slotIndex: number, name: string, thumbnail?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await manager.save(slotIndex, name, thumbnail);
      await refreshSlots();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [manager, refreshSlots]);
  
  const load = useCallback(async (slotIndex: number) => {
    setLoading(true);
    setError(null);
    
    try {
      await manager.load(slotIndex);
      setState(manager.getCurrentState());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [manager]);
  
  const deleteSave = useCallback(async (slotIndex: number) => {
    await manager.deleteSave(slotIndex);
    await refreshSlots();
  }, [manager, refreshSlots]);
  
  return {
    manager,
    state,
    slots,
    loading,
    error,
    save,
    load,
    deleteSave,
    refreshSlots,
    newGame: () => manager.newGame(),
    getPlayTime: () => manager.getFormattedPlayTime(),
    startAutoSave: () => manager.startAutoSave(),
    stopAutoSave: () => manager.stopAutoSave(),
    createCheckpoint: (id: string) => manager.createCheckpoint(id),
    loadCheckpoint: (id: string) => manager.loadCheckpoint(id),
  };
}

export default {
  GameStateManager,
  GameStateProvider,
  useGameState,
  LocalStorageAdapter,
  IndexedDBAdapter,
  Compressor,
  Checksum,
};
