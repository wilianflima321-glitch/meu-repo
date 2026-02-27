/**
 * Quest system shared contracts.
 */

export type QuestState = 
  | 'locked'      // Not yet available
  | 'available'   // Can be started
  | 'active'      // In progress
  | 'completed'   // All objectives done
  | 'failed'      // Quest failed
  | 'abandoned'   // Player abandoned
  | 'turned_in';  // Rewards claimed

export type ObjectiveType =
  | 'kill'        // Kill X enemies
  | 'collect'     // Collect X items
  | 'interact'    // Interact with object/NPC
  | 'reach'       // Reach location
  | 'escort'      // Escort NPC
  | 'defend'      // Defend location/NPC
  | 'craft'       // Craft items
  | 'deliver'     // Deliver item to NPC
  | 'talk'        // Talk to NPC
  | 'explore'     // Discover locations
  | 'timer'       // Complete within time
  | 'custom';     // Custom condition

export type QuestCategory = 
  | 'main'
  | 'side'
  | 'daily'
  | 'weekly'
  | 'event'
  | 'hidden'
  | 'repeatable';

export type QuestPriority = 'critical' | 'high' | 'normal' | 'low';

export interface QuestReward {
  type: 'xp' | 'currency' | 'item' | 'reputation' | 'unlock' | 'achievement' | 'custom';
  id?: string;
  amount?: number;
  data?: unknown;
}

export interface ObjectiveDefinition {
  id: string;
  type: ObjectiveType;
  description: string;
  target?: string;           // Target entity/item/location ID
  requiredAmount: number;
  optional?: boolean;
  hidden?: boolean;
  order?: number;            // Order within quest
  location?: { x: number; y: number; z: number; radius?: number };
  customCheck?: (state: QuestState, progress: number) => boolean;
}

export interface ObjectiveProgress {
  currentAmount: number;
  completed: boolean;
  failedAt?: number;
  completedAt?: number;
}

export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  category: QuestCategory;
  priority?: QuestPriority;
  level?: number;
  estimatedTime?: string;
  objectives: ObjectiveDefinition[];
  rewards: QuestReward[];
  prerequisites?: string[];    // Required quest IDs
  unlocks?: string[];          // Quests to unlock on completion
  repeatable?: boolean;
  cooldown?: number;           // Cooldown in ms for repeatable
  timeLimit?: number;          // Time limit in ms
  autoComplete?: boolean;      // Complete without turn-in
  failConditions?: {
    type: 'timer' | 'death' | 'leave_area' | 'custom';
    value?: unknown;
  }[];
  branches?: {
    conditionId: string;
    nextQuestId: string;
  }[];
  metadata?: Record<string, unknown>;
}

export interface QuestInstance {
  definition: QuestDefinition;
  state: QuestState;
  objectiveProgress: Map<string, ObjectiveProgress>;
  startedAt: number | null;
  completedAt: number | null;
  failedAt: number | null;
  expiresAt: number | null;
  tracked: boolean;
  repeatCount: number;
}

export interface QuestJournalEntry {
  quest: QuestDefinition;
  state: QuestState;
  objectives: {
    definition: ObjectiveDefinition;
    progress: ObjectiveProgress;
  }[];
  tracked: boolean;
  timeRemaining?: number;
}
