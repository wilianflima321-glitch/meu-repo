/**
 * Game state manager shared contracts.
 */

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
