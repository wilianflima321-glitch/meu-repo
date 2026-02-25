export type AchievementType = 'standard' | 'hidden' | 'progressive' | 'milestone' | 'daily' | 'weekly';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  hiddenDescription?: string;
  type: AchievementType;
  rarity: AchievementRarity;
  icon: string;
  iconLocked?: string;
  points: number;
  category?: string;
  tags?: string[];
  sortOrder?: number;
  conditions: AchievementCondition[];
  rewards?: AchievementReward[];
  prerequisiteIds?: string[];
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export interface AchievementCondition {
  type: 'stat' | 'flag' | 'achievement' | 'custom';
  statId?: string;
  operator?: ComparisonOperator;
  value?: number | string | boolean;
  customCheck?: string;
}

export interface AchievementReward {
  type: 'currency' | 'item' | 'cosmetic' | 'title' | 'badge' | 'xp' | 'custom';
  id: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  isUnlocked: boolean;
  unlockedAt?: number;
  claimedRewards: boolean;
  metadata?: Record<string, unknown>;
}

export interface Statistic {
  id: string;
  name: string;
  description?: string;
  type: 'int' | 'float' | 'max' | 'min' | 'set' | 'avg';
  defaultValue: number;
  displayFormat?: string;
  category?: string;
  isPublic: boolean;
}

export interface StatisticValue {
  statId: string;
  value: number;
  lastUpdated: number;
  history?: { value: number; timestamp: number }[];
}

export interface Leaderboard {
  id: string;
  name: string;
  statId: string;
  sortOrder: 'asc' | 'desc';
  displayType: 'numeric' | 'time' | 'score';
  resetPeriod?: 'daily' | 'weekly' | 'monthly' | 'never';
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
