/**
 * Achievement System - Sistema de Conquistas e Progressão
 * 
 * Sistema completo de conquistas com:
 * - Achievement definitions e tracking
 * - Progress tracking (incremental, milestones)
 * - Unlock conditions (single, compound)
 * - Rewards system integration
 * - Cloud sync ready
 * - Statistics tracking
 * - Leaderboards integration ready
 * 
 * @module lib/achievements/achievement-system
 */

import { EventEmitter } from 'events';

import type {
  Achievement,
  AchievementCondition,
  AchievementProgress,
  AchievementRarity,
  AchievementReward,
  AchievementType,
  ComparisonOperator,
  Leaderboard,
  LeaderboardEntry,
  Statistic,
  StatisticValue,
} from './achievement-system.types';
import {
  AchievementProvider,
  useAchievement,
  useAchievements,
  useStat,
} from './achievement-system-hooks';

export type {
  Achievement,
  AchievementCondition,
  AchievementProgress,
  AchievementRarity,
  AchievementReward,
  AchievementType,
  ComparisonOperator,
  Leaderboard,
  LeaderboardEntry,
  Statistic,
  StatisticValue,
} from './achievement-system.types';

// ============================================================================
// STATISTICS MANAGER
// ============================================================================

export class StatisticsManager extends EventEmitter {
  private statistics: Map<string, Statistic> = new Map();
  private values: Map<string, StatisticValue> = new Map();
  private trackHistory: boolean;
  private maxHistoryLength: number;
  
  constructor(trackHistory = false, maxHistoryLength = 100) {
    super();
    this.trackHistory = trackHistory;
    this.maxHistoryLength = maxHistoryLength;
  }
  
  registerStat(stat: Statistic): void {
    this.statistics.set(stat.id, stat);
    
    if (!this.values.has(stat.id)) {
      this.values.set(stat.id, {
        statId: stat.id,
        value: stat.defaultValue,
        lastUpdated: Date.now(),
        history: this.trackHistory ? [] : undefined,
      });
    }
  }
  
  registerStats(stats: Statistic[]): void {
    for (const stat of stats) {
      this.registerStat(stat);
    }
  }
  
  getStat(statId: string): number {
    return this.values.get(statId)?.value ?? 0;
  }
  
  getStatValue(statId: string): StatisticValue | undefined {
    return this.values.get(statId);
  }
  
  getStatDefinition(statId: string): Statistic | undefined {
    return this.statistics.get(statId);
  }
  
  setStat(statId: string, value: number): void {
    const stat = this.statistics.get(statId);
    const current = this.values.get(statId);
    
    if (!stat || !current) return;
    
    let newValue = value;
    
    // Apply stat type logic
    switch (stat.type) {
      case 'max':
        newValue = Math.max(current.value, value);
        break;
      case 'min':
        newValue = Math.min(current.value, value);
        break;
      case 'avg':
        // For avg, we track sum and count in metadata
        break;
    }
    
    const oldValue = current.value;
    current.value = newValue;
    current.lastUpdated = Date.now();
    
    if (this.trackHistory && current.history) {
      current.history.push({ value: newValue, timestamp: current.lastUpdated });
      
      while (current.history.length > this.maxHistoryLength) {
        current.history.shift();
      }
    }
    
    this.emit('statChanged', { statId, oldValue, newValue, stat });
  }
  
  incrementStat(statId: string, amount = 1): void {
    const current = this.getStat(statId);
    this.setStat(statId, current + amount);
  }
  
  decrementStat(statId: string, amount = 1): void {
    const current = this.getStat(statId);
    this.setStat(statId, current - amount);
  }
  
  resetStat(statId: string): void {
    const stat = this.statistics.get(statId);
    if (stat) {
      this.setStat(statId, stat.defaultValue);
    }
  }
  
  resetAllStats(): void {
    for (const stat of this.statistics.values()) {
      this.setStat(stat.id, stat.defaultValue);
    }
  }
  
  getAllStats(): Map<string, StatisticValue> {
    return new Map(this.values);
  }
  
  getPublicStats(): StatisticValue[] {
    const result: StatisticValue[] = [];
    
    for (const [statId, value] of this.values) {
      const stat = this.statistics.get(statId);
      if (stat?.isPublic) {
        result.push(value);
      }
    }
    
    return result;
  }
  
  getStatsByCategory(category: string): StatisticValue[] {
    const result: StatisticValue[] = [];
    
    for (const [statId, value] of this.values) {
      const stat = this.statistics.get(statId);
      if (stat?.category === category) {
        result.push(value);
      }
    }
    
    return result;
  }
  
  formatStat(statId: string): string {
    const stat = this.statistics.get(statId);
    const value = this.values.get(statId);
    
    if (!stat || !value) return '0';
    
    if (stat.displayFormat) {
      return stat.displayFormat.replace('{value}', String(value.value));
    }
    
    return String(value.value);
  }
  
  serialize(): { stats: Record<string, StatisticValue> } {
    const stats: Record<string, StatisticValue> = {};
    
    for (const [id, value] of this.values) {
      stats[id] = {
        ...value,
        history: undefined, // Don't serialize history by default
      };
    }
    
    return { stats };
  }
  
  deserialize(data: { stats: Record<string, StatisticValue> }): void {
    for (const [id, value] of Object.entries(data.stats)) {
      if (this.values.has(id)) {
        const current = this.values.get(id)!;
        current.value = value.value;
        current.lastUpdated = value.lastUpdated;
      }
    }
  }
}

// ============================================================================
// ACHIEVEMENT MANAGER
// ============================================================================

export class AchievementManager extends EventEmitter {
  private achievements: Map<string, Achievement> = new Map();
  private progress: Map<string, AchievementProgress> = new Map();
  private statistics: StatisticsManager;
  private flags: Set<string> = new Set();
  private customCheckers: Map<string, (context: CustomCheckContext) => boolean> = new Map();
  
  constructor(statistics?: StatisticsManager) {
    super();
    this.statistics = statistics || new StatisticsManager();
    this.setupStatListener();
  }
  
  private setupStatListener(): void {
    this.statistics.on('statChanged', ({ statId }) => {
      this.checkAchievementsForStat(statId);
    });
  }
  
  // ============================================================================
  // ACHIEVEMENT REGISTRATION
  // ============================================================================
  
  registerAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);
    
    if (!this.progress.has(achievement.id)) {
      const targetValue = this.calculateTargetValue(achievement);
      
      this.progress.set(achievement.id, {
        achievementId: achievement.id,
        currentValue: 0,
        targetValue,
        isUnlocked: false,
        claimedRewards: false,
      });
    }
    
    this.emit('achievementRegistered', { achievement });
  }
  
  registerAchievements(achievements: Achievement[]): void {
    for (const achievement of achievements) {
      this.registerAchievement(achievement);
    }
  }
  
  private calculateTargetValue(achievement: Achievement): number {
    // For progressive achievements, find the highest numeric condition value
    if (achievement.type === 'progressive' || achievement.type === 'milestone') {
      for (const condition of achievement.conditions) {
        if (condition.type === 'stat' && typeof condition.value === 'number') {
          return condition.value;
        }
      }
    }
    
    return 1; // Binary achievement
  }
  
  // ============================================================================
  // CONDITION CHECKING
  // ============================================================================
  
  registerCustomChecker(id: string, checker: (context: CustomCheckContext) => boolean): void {
    this.customCheckers.set(id, checker);
  }
  
  setFlag(flag: string): void {
    this.flags.add(flag);
    this.checkAchievementsForFlag(flag);
    this.emit('flagSet', { flag });
  }
  
  clearFlag(flag: string): void {
    this.flags.delete(flag);
    this.emit('flagCleared', { flag });
  }
  
  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }
  
  private checkCondition(condition: AchievementCondition): boolean {
    switch (condition.type) {
      case 'stat':
        return this.checkStatCondition(condition);
      case 'flag':
        return this.flags.has(condition.statId!);
      case 'achievement':
        return this.isUnlocked(condition.statId!);
      case 'custom':
        return this.checkCustomCondition(condition);
      default:
        return false;
    }
  }
  
  private checkStatCondition(condition: AchievementCondition): boolean {
    if (!condition.statId || condition.value === undefined) return false;
    
    const currentValue = this.statistics.getStat(condition.statId);
    const targetValue = condition.value as number;
    
    switch (condition.operator) {
      case '==':
        return currentValue === targetValue;
      case '!=':
        return currentValue !== targetValue;
      case '>':
        return currentValue > targetValue;
      case '<':
        return currentValue < targetValue;
      case '>=':
        return currentValue >= targetValue;
      case '<=':
        return currentValue <= targetValue;
      default:
        return currentValue >= targetValue;
    }
  }
  
  private checkCustomCondition(condition: AchievementCondition): boolean {
    if (!condition.customCheck) return false;
    
    const checker = this.customCheckers.get(condition.customCheck);
    if (!checker) return false;
    
    return checker({
      condition,
      statistics: this.statistics,
      flags: this.flags,
      achievements: this,
    });
  }
  
  private checkAchievementsForStat(statId: string): void {
    for (const [achievementId, achievement] of this.achievements) {
      const progress = this.progress.get(achievementId);
      if (!progress || progress.isUnlocked) continue;
      
      // Check if this achievement uses this stat
      const usesStat = achievement.conditions.some(
        (c) => c.type === 'stat' && c.statId === statId
      );
      
      if (usesStat) {
        this.checkAndUpdateProgress(achievement);
      }
    }
  }
  
  private checkAchievementsForFlag(flag: string): void {
    for (const [achievementId, achievement] of this.achievements) {
      const progress = this.progress.get(achievementId);
      if (!progress || progress.isUnlocked) continue;
      
      const usesFlag = achievement.conditions.some(
        (c) => c.type === 'flag' && c.statId === flag
      );
      
      if (usesFlag) {
        this.checkAndUpdateProgress(achievement);
      }
    }
  }
  
  private checkAndUpdateProgress(achievement: Achievement): void {
    const progress = this.progress.get(achievement.id);
    if (!progress || progress.isUnlocked) return;
    
    // Check prerequisites
    if (achievement.prerequisiteIds) {
      const allPrereqsMet = achievement.prerequisiteIds.every((id) => this.isUnlocked(id));
      if (!allPrereqsMet) return;
    }
    
    // Check expiry
    if (achievement.expiresAt && Date.now() > achievement.expiresAt) {
      return;
    }
    
    // Update progress value for progressive achievements
    if (achievement.type === 'progressive' || achievement.type === 'milestone') {
      for (const condition of achievement.conditions) {
        if (condition.type === 'stat' && condition.statId) {
          const currentValue = this.statistics.getStat(condition.statId);
          const oldValue = progress.currentValue;
          progress.currentValue = currentValue;
          
          if (currentValue !== oldValue) {
            this.emit('progressUpdated', {
              achievement,
              progress,
              oldValue,
              newValue: currentValue,
            });
          }
        }
      }
    }
    
    // Check if all conditions are met
    const allConditionsMet = achievement.conditions.every((c) => this.checkCondition(c));
    
    if (allConditionsMet) {
      this.unlock(achievement.id);
    }
  }
  
  // ============================================================================
  // UNLOCK & REWARDS
  // ============================================================================
  
  unlock(achievementId: string, silent = false): boolean {
    const achievement = this.achievements.get(achievementId);
    const progress = this.progress.get(achievementId);
    
    if (!achievement || !progress) return false;
    if (progress.isUnlocked) return false;
    
    progress.isUnlocked = true;
    progress.unlockedAt = Date.now();
    progress.currentValue = progress.targetValue;
    
    if (!silent) {
      this.emit('achievementUnlocked', { achievement, progress });
    }
    
    // Check if this unlocks other achievements
    for (const [id, ach] of this.achievements) {
      if (ach.prerequisiteIds?.includes(achievementId)) {
        this.checkAndUpdateProgress(ach);
      }
    }
    
    return true;
  }
  
  claimRewards(achievementId: string): AchievementReward[] | null {
    const achievement = this.achievements.get(achievementId);
    const progress = this.progress.get(achievementId);
    
    if (!achievement || !progress) return null;
    if (!progress.isUnlocked || progress.claimedRewards) return null;
    
    progress.claimedRewards = true;
    
    const rewards = achievement.rewards || [];
    
    this.emit('rewardsClaimed', { achievement, rewards });
    
    return rewards;
  }
  
  hasUnclaimedRewards(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    const progress = this.progress.get(achievementId);
    
    if (!achievement || !progress) return false;
    
    return progress.isUnlocked && !progress.claimedRewards && (achievement.rewards?.length || 0) > 0;
  }
  
  getUnclaimedRewards(): { achievement: Achievement; rewards: AchievementReward[] }[] {
    const result: { achievement: Achievement; rewards: AchievementReward[] }[] = [];
    
    for (const [id, achievement] of this.achievements) {
      if (this.hasUnclaimedRewards(id) && achievement.rewards) {
        result.push({ achievement, rewards: achievement.rewards });
      }
    }
    
    return result;
  }
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  getAchievement(achievementId: string): Achievement | undefined {
    return this.achievements.get(achievementId);
  }
  
  getProgress(achievementId: string): AchievementProgress | undefined {
    return this.progress.get(achievementId);
  }
  
  isUnlocked(achievementId: string): boolean {
    return this.progress.get(achievementId)?.isUnlocked ?? false;
  }
  
  getProgressPercent(achievementId: string): number {
    const progress = this.progress.get(achievementId);
    if (!progress) return 0;
    if (progress.isUnlocked) return 100;
    
    return Math.min(100, (progress.currentValue / progress.targetValue) * 100);
  }
  
  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).sort((a, b) => {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }
  
  getAchievementsByCategory(category: string): Achievement[] {
    return this.getAllAchievements().filter((a) => a.category === category);
  }
  
  getAchievementsByType(type: AchievementType): Achievement[] {
    return this.getAllAchievements().filter((a) => a.type === type);
  }
  
  getUnlockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter((a) => this.isUnlocked(a.id));
  }
  
  getLockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter((a) => !this.isUnlocked(a.id));
  }
  
  getVisibleAchievements(): Achievement[] {
    return this.getAllAchievements().filter((a) => {
      if (a.type !== 'hidden') return true;
      return this.isUnlocked(a.id); // Show hidden only when unlocked
    });
  }
  
  getCategories(): string[] {
    const categories = new Set<string>();
    
    for (const achievement of this.achievements.values()) {
      if (achievement.category) {
        categories.add(achievement.category);
      }
    }
    
    return Array.from(categories);
  }
  
  getTotalPoints(): number {
    let total = 0;
    
    for (const achievement of this.achievements.values()) {
      if (this.isUnlocked(achievement.id)) {
        total += achievement.points;
      }
    }
    
    return total;
  }
  
  getMaxPoints(): number {
    let total = 0;
    
    for (const achievement of this.achievements.values()) {
      total += achievement.points;
    }
    
    return total;
  }
  
  getCompletionPercent(): number {
    const total = this.achievements.size;
    if (total === 0) return 0;
    
    const unlocked = this.getUnlockedAchievements().length;
    return (unlocked / total) * 100;
  }
  
  // ============================================================================
  // STATISTICS ACCESS
  // ============================================================================
  
  getStatistics(): StatisticsManager {
    return this.statistics;
  }
  
  incrementStat(statId: string, amount = 1): void {
    this.statistics.incrementStat(statId, amount);
  }
  
  setStat(statId: string, value: number): void {
    this.statistics.setStat(statId, value);
  }
  
  getStat(statId: string): number {
    return this.statistics.getStat(statId);
  }
  
  // ============================================================================
  // SERIALIZATION
  // ============================================================================
  
  serialize(): {
    progress: Record<string, AchievementProgress>;
    statistics: ReturnType<StatisticsManager['serialize']>;
    flags: string[];
  } {
    const progressData: Record<string, AchievementProgress> = {};
    
    for (const [id, progress] of this.progress) {
      progressData[id] = { ...progress };
    }
    
    return {
      progress: progressData,
      statistics: this.statistics.serialize(),
      flags: Array.from(this.flags),
    };
  }
  
  deserialize(data: ReturnType<AchievementManager['serialize']>): void {
    // Restore progress
    for (const [id, progressData] of Object.entries(data.progress)) {
      if (this.progress.has(id)) {
        const current = this.progress.get(id)!;
        Object.assign(current, progressData);
      }
    }
    
    // Restore statistics
    this.statistics.deserialize(data.statistics);
    
    // Restore flags
    this.flags.clear();
    for (const flag of data.flags) {
      this.flags.add(flag);
    }
    
    this.emit('dataRestored');
  }
  
  reset(): void {
    for (const progress of this.progress.values()) {
      progress.currentValue = 0;
      progress.isUnlocked = false;
      progress.unlockedAt = undefined;
      progress.claimedRewards = false;
    }
    
    this.flags.clear();
    this.statistics.resetAllStats();
    
    this.emit('reset');
  }
  
  dispose(): void {
    this.achievements.clear();
    this.progress.clear();
    this.flags.clear();
    this.customCheckers.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// CUSTOM CHECK CONTEXT
// ============================================================================

export interface CustomCheckContext {
  condition: AchievementCondition;
  statistics: StatisticsManager;
  flags: Set<string>;
  achievements: AchievementManager;
}

// ============================================================================
// ACHIEVEMENT BUILDER
// ============================================================================

export class AchievementBuilder {
  private achievement: Partial<Achievement> = {
    conditions: [],
    rewards: [],
    tags: [],
  };
  
  constructor(id: string) {
    this.achievement.id = id;
  }
  
  name(name: string): this {
    this.achievement.name = name;
    return this;
  }
  
  description(description: string): this {
    this.achievement.description = description;
    return this;
  }
  
  hiddenDescription(description: string): this {
    this.achievement.hiddenDescription = description;
    return this;
  }
  
  type(type: AchievementType): this {
    this.achievement.type = type;
    return this;
  }
  
  rarity(rarity: AchievementRarity): this {
    this.achievement.rarity = rarity;
    return this;
  }
  
  icon(icon: string, iconLocked?: string): this {
    this.achievement.icon = icon;
    this.achievement.iconLocked = iconLocked;
    return this;
  }
  
  points(points: number): this {
    this.achievement.points = points;
    return this;
  }
  
  category(category: string): this {
    this.achievement.category = category;
    return this;
  }
  
  tag(...tags: string[]): this {
    this.achievement.tags!.push(...tags);
    return this;
  }
  
  sortOrder(order: number): this {
    this.achievement.sortOrder = order;
    return this;
  }
  
  requireStat(statId: string, value: number, operator: ComparisonOperator = '>='): this {
    this.achievement.conditions!.push({
      type: 'stat',
      statId,
      value,
      operator,
    });
    return this;
  }
  
  requireFlag(flag: string): this {
    this.achievement.conditions!.push({
      type: 'flag',
      statId: flag,
    });
    return this;
  }
  
  requireAchievement(achievementId: string): this {
    this.achievement.conditions!.push({
      type: 'achievement',
      statId: achievementId,
    });
    return this;
  }
  
  requireCustom(checkerId: string): this {
    this.achievement.conditions!.push({
      type: 'custom',
      customCheck: checkerId,
    });
    return this;
  }
  
  prerequisite(...achievementIds: string[]): this {
    this.achievement.prerequisiteIds = [
      ...(this.achievement.prerequisiteIds || []),
      ...achievementIds,
    ];
    return this;
  }
  
  reward(type: AchievementReward['type'], id: string, amount?: number): this {
    this.achievement.rewards!.push({ type, id, amount });
    return this;
  }
  
  expiresAt(timestamp: number): this {
    this.achievement.expiresAt = timestamp;
    return this;
  }
  
  metadata(data: Record<string, unknown>): this {
    this.achievement.metadata = { ...this.achievement.metadata, ...data };
    return this;
  }
  
  build(): Achievement {
    if (!this.achievement.id || !this.achievement.name) {
      throw new Error('Achievement requires id and name');
    }
    
    return {
      id: this.achievement.id,
      name: this.achievement.name,
      description: this.achievement.description || '',
      hiddenDescription: this.achievement.hiddenDescription,
      type: this.achievement.type || 'standard',
      rarity: this.achievement.rarity || 'common',
      icon: this.achievement.icon || 'default',
      iconLocked: this.achievement.iconLocked,
      points: this.achievement.points || 10,
      category: this.achievement.category,
      tags: this.achievement.tags,
      sortOrder: this.achievement.sortOrder,
      conditions: this.achievement.conditions!,
      rewards: this.achievement.rewards,
      prerequisiteIds: this.achievement.prerequisiteIds,
      expiresAt: this.achievement.expiresAt,
      metadata: this.achievement.metadata,
    };
  }
}

export {
  AchievementProvider,
  useAchievement,
  useAchievements,
  useStat,
} from './achievement-system-hooks';

const __defaultExport = {
  AchievementManager,
  StatisticsManager,
  AchievementBuilder,
  AchievementProvider,
  useAchievements,
  useAchievement,
  useStat,
};

export default __defaultExport;
