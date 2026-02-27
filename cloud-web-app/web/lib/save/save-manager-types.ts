/**
 * Shared contracts for save/autosave manager runtime.
 */

export type SaveType = 'manual' | 'autosave' | 'quicksave' | 'checkpoint';
export type SaveLocation = 'local' | 'cloud' | 'both';
export type SaveStatus = 'idle' | 'saving' | 'loading' | 'syncing' | 'error';

export interface SaveMetadata {
  id: string;
  slotIndex: number;
  name: string;
  type: SaveType;
  version: number;
  createdAt: number;
  modifiedAt: number;
  playTime: number; // seconds
  location: string; // in-game location name
  chapter?: string;
  level?: number;
  thumbnailUrl?: string;
  checksum: string;
  compressed: boolean;
  size: number;
  gameVersion: string;
  customData?: Record<string, unknown>;
}

export interface SaveData {
  metadata: SaveMetadata;
  state: GameState;
}

export interface GameState {
  player: PlayerState;
  world: WorldState;
  quests: QuestState[];
  inventory: InventoryState;
  settings: SettingsState;
  statistics: StatisticsState;
  custom: Record<string, unknown>;
}

export interface PlayerState {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  stamina?: number;
  maxStamina?: number;
  level: number;
  experience: number;
  attributes: Record<string, number>;
  skills: Record<string, number>;
  abilities: string[];
  equipment: Record<string, string>;
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  id: string;
  type: string;
  duration: number;
  strength: number;
}

export interface WorldState {
  scene: string;
  time: number;
  weather: string;
  entities: EntityState[];
  triggers: Record<string, boolean>;
  doors: Record<string, boolean>;
  containers: Record<string, ContainerState>;
  npcs: Record<string, NPCState>;
}

export interface EntityState {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  active: boolean;
  data: Record<string, unknown>;
}

export interface ContainerState {
  id: string;
  opened: boolean;
  looted: boolean;
  items: string[];
}

export interface NPCState {
  id: string;
  alive: boolean;
  health: number;
  position: { x: number; y: number; z: number };
  dialogueState: string;
  relationship: number;
}

export interface QuestState {
  id: string;
  status: 'inactive' | 'active' | 'completed' | 'failed';
  currentObjective: number;
  objectives: ObjectiveState[];
  startedAt?: number;
  completedAt?: number;
}

export interface ObjectiveState {
  id: string;
  completed: boolean;
  progress: number;
  target: number;
}

export interface InventoryState {
  items: ItemState[];
  currency: Record<string, number>;
  capacity: number;
}

export interface ItemState {
  id: string;
  templateId: string;
  quantity: number;
  durability?: number;
  enchantments?: string[];
  customData?: Record<string, unknown>;
}

export interface SettingsState {
  audio: AudioSettings;
  video: VideoSettings;
  controls: ControlSettings;
  gameplay: GameplaySettings;
}

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  ambientVolume: number;
  muted: boolean;
}

export interface VideoSettings {
  resolution: { width: number; height: number };
  fullscreen: boolean;
  vsync: boolean;
  fpsLimit: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  shadows: boolean;
  antialiasing: boolean;
  motionBlur: boolean;
  bloom: boolean;
}

export interface ControlSettings {
  keybindings: Record<string, string>;
  mouseSensitivity: number;
  invertY: boolean;
  gamepadEnabled: boolean;
  vibration: boolean;
}

export interface GameplaySettings {
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
  autoAim: boolean;
  subtitles: boolean;
  hints: boolean;
  language: string;
}

export interface StatisticsState {
  totalPlayTime: number;
  deaths: number;
  kills: number;
  distanceTraveled: number;
  itemsCollected: number;
  questsCompleted: number;
  achievementsUnlocked: string[];
  custom: Record<string, number>;
}

export interface SaveSlot {
  index: number;
  occupied: boolean;
  metadata?: SaveMetadata;
  locked: boolean;
}

export interface SaveManagerConfig {
  maxSlots: number;
  autosaveEnabled: boolean;
  autosaveInterval: number; // seconds
  maxAutosaves: number;
  quicksaveSlot: number;
  compressionEnabled: boolean;
  cloudSyncEnabled: boolean;
  saveVersion: number;
  gameVersion: string;
  storageKey: string;
}

export interface CloudProvider {
  name: string;
  upload(data: SaveData): Promise<string>;
  download(id: string): Promise<SaveData>;
  list(): Promise<SaveMetadata[]>;
  delete(id: string): Promise<void>;
  sync(): Promise<void>;
}
