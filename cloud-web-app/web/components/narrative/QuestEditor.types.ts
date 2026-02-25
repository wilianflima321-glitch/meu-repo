import type { Node } from '@xyflow/react';

export type QuestState = 'unavailable' | 'available' | 'active' | 'completed' | 'failed';

export type ObjectiveType =
  | 'collect'
  | 'kill'
  | 'explore'
  | 'talk'
  | 'escort'
  | 'defend'
  | 'craft'
  | 'deliver'
  | 'custom';

export type RewardType = 'xp' | 'gold' | 'item' | 'reputation' | 'skill' | 'unlock';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  targetId?: string;
  targetCount: number;
  currentCount: number;
  isOptional: boolean;
  isHidden: boolean;
  timeLimit?: number;
  hints: string[];
  onComplete?: string;
}

export interface QuestReward {
  id: string;
  type: RewardType;
  itemId?: string;
  amount: number;
  description: string;
}

export interface QuestPrerequisite {
  type: 'quest' | 'level' | 'reputation' | 'item' | 'variable';
  questId?: string;
  level?: number;
  faction?: string;
  reputationAmount?: number;
  itemId?: string;
  variable?: string;
  value?: unknown;
}

export interface QuestNodeData extends Record<string, unknown> {
  questId: string;
  title: string;
  description: string;
  state: QuestState;
  category: string;
  level: number;
  isMainQuest: boolean;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: QuestPrerequisite[];
  giver?: string;
  location?: string;
  timeLimit?: number;
  repeatableAfter?: number;
  journalEntry?: string;
}

export interface QuestCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export type QuestFlowNode = Node<QuestNodeData>;

