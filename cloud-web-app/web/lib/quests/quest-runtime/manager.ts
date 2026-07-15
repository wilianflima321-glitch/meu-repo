/**
 * Quest System - split gameplay runtime.
 *
 * Quest authoring, runtime state, and React bindings are separated so Studio
 * can lazy-load gameplay systems without pulling the whole subsystem at once.
 */

import { logger } from '@/lib/observability/logger';
import { EventEmitter } from 'events';
import { buildQuestJournal } from './manager-journal';
import {
  applyQuestManagerState,
  createObjectiveProgress,
  createQuestInstance,
  requiredObjectivesComplete,
  resetQuestInstance,
  serializeQuestManagerState,
} from './manager-state';
import { findLocationObjectiveUpdates, findObjectiveUpdatesByTarget } from './manager-objectives';
import { grantQuestRewards } from './manager-rewards';
import { selectHighestPriorityQuest } from './manager-tracking';
import { findExpiredQuestIds } from './manager-timers';
import type { QuestCategory, QuestDefinition, QuestInstance, QuestJournalEntry, QuestState } from './types';

export class QuestManager extends EventEmitter {
  private definitions: Map<string, QuestDefinition> = new Map();
  private instances: Map<string, QuestInstance> = new Map();
  private completedQuests: Set<string> = new Set();
  private activeQuestIds: Set<string> = new Set();
  private trackedQuestId: string | null = null;
  private maxActiveQuests = 20;
  private checkIntervalId: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
  }
  
  // ============================================================================
  // REGISTRATION
  // ============================================================================
  
  registerQuest(definition: QuestDefinition): void {
    // Validate objectives
    for (const obj of definition.objectives) {
      if (obj.requiredAmount < 1) {
        throw new Error(`Objective ${obj.id} must have requiredAmount >= 1`);
      }
    }
    
    this.definitions.set(definition.id, definition);
    
    this.instances.set(definition.id, createQuestInstance(definition));
    
    this.emit('questRegistered', { questId: definition.id, definition });
  }
  
  registerQuests(definitions: QuestDefinition[]): void {
    for (const def of definitions) {
      this.registerQuest(def);
    }
    
    // Check prerequisites after all registered
    this.updateQuestAvailability();
  }
  
  // ============================================================================
  // QUEST LIFECYCLE
  // ============================================================================
  
  startQuest(questId: string): boolean {
    const instance = this.instances.get(questId);
    if (!instance) return false;
    
    if (instance.state !== 'available') {
      logger.warn(`Quest ${questId} is not available (state: ${instance.state})`);
      return false;
    }
    
    if (this.activeQuestIds.size >= this.maxActiveQuests) {
      logger.warn('Maximum active quests reached');
      return false;
    }
    
    instance.state = 'active';
    instance.startedAt = Date.now();
    
    // Set expiration if time limit
    if (instance.definition.timeLimit) {
      instance.expiresAt = instance.startedAt + instance.definition.timeLimit;
    }
    
    // Reset progress
    instance.objectiveProgress = createObjectiveProgress(instance.definition);
    
    this.activeQuestIds.add(questId);
    
    // Auto-track if first active quest
    if (this.trackedQuestId === null) {
      this.trackQuest(questId);
    }
    
    this.emit('questStarted', { questId, instance });
    
    return true;
  }
  
  abandonQuest(questId: string): boolean {
    const instance = this.instances.get(questId);
    if (!instance || instance.state !== 'active') return false;
    
    instance.state = 'abandoned';
    this.activeQuestIds.delete(questId);
    
    if (this.trackedQuestId === questId) {
      this.trackedQuestId = null;
      this.autoSelectTrackedQuest();
    }
    
    // Make available again if not repeatable with cooldown
    if (!instance.definition.repeatable) {
      instance.state = 'available';
    }
    
    this.emit('questAbandoned', { questId });
    
    return true;
  }
  
  failQuest(questId: string, reason?: string): boolean {
    const instance = this.instances.get(questId);
    if (!instance || instance.state !== 'active') return false;
    
    instance.state = 'failed';
    instance.failedAt = Date.now();
    this.activeQuestIds.delete(questId);
    
    if (this.trackedQuestId === questId) {
      this.trackedQuestId = null;
      this.autoSelectTrackedQuest();
    }
    
    this.emit('questFailed', { questId, reason });
    
    return true;
  }
  
  completeQuest(questId: string): boolean {
    const instance = this.instances.get(questId);
    if (!instance || instance.state !== 'active') return false;
    
    if (!requiredObjectivesComplete(instance)) {
      logger.warn(`Quest ${questId} has incomplete required objectives`);
      return false;
    }
    
    instance.state = 'completed';
    instance.completedAt = Date.now();
    this.activeQuestIds.delete(questId);
    
    if (instance.definition.autoComplete) {
      return this.turnInQuest(questId);
    }
    
    this.emit('questCompleted', { questId, instance });
    
    return true;
  }
  
  turnInQuest(questId: string): boolean {
    const instance = this.instances.get(questId);
    if (!instance || (instance.state !== 'completed' && instance.state !== 'active')) {
      return false;
    }
    
    // If active, verify completion first
    if (instance.state === 'active') {
      if (!this.completeQuest(questId)) {
        return false;
      }
    }
    
    instance.state = 'turned_in';
    instance.repeatCount++;
    this.completedQuests.add(questId);
    
    if (this.trackedQuestId === questId) {
      this.trackedQuestId = null;
      this.autoSelectTrackedQuest();
    }
    
    // Grant rewards
    const rewards = grantQuestRewards(instance.definition.rewards, (reward) => {
      this.emit('rewardGranted', { reward });
    });
    
    // Unlock dependent quests
    if (instance.definition.unlocks) {
      for (const unlockId of instance.definition.unlocks) {
        this.unlockQuest(unlockId);
      }
    }
    
    // Update availability
    this.updateQuestAvailability();
    
    // Handle repeatable
    if (instance.definition.repeatable) {
      this.resetRepeatableQuest(questId);
    }
    
    this.emit('questTurnedIn', { questId, rewards });
    
    return true;
  }
  
  private resetRepeatableQuest(questId: string): void {
    const instance = this.instances.get(questId);
    if (!instance) return;
    
    // Reset after cooldown
    const cooldown = instance.definition.cooldown || 0;
    
    setTimeout(() => {
      if (instance.state === 'turned_in' || instance.state === 'failed') {
        resetQuestInstance(instance);
        this.emit('questReset', { questId });
      }
    }, cooldown);
  }
  
  // ============================================================================
  // OBJECTIVE PROGRESS
  // ============================================================================
  
  updateObjective(
    questId: string,
    objectiveId: string,
    amount: number,
    mode: 'add' | 'set' = 'add'
  ): boolean {
    const instance = this.instances.get(questId);
    if (!instance || instance.state !== 'active') return false;
    
    const progress = instance.objectiveProgress.get(objectiveId);
    if (!progress) return false;
    
    if (progress.completed) return false;
    
    const objDef = instance.definition.objectives.find((o) => o.id === objectiveId);
    if (!objDef) return false;
    
    if (mode === 'add') {
      progress.currentAmount = Math.min(
        progress.currentAmount + amount,
        objDef.requiredAmount
      );
    } else {
      progress.currentAmount = Math.min(amount, objDef.requiredAmount);
    }
    
    this.emit('objectiveProgress', {
      questId,
      objectiveId,
      current: progress.currentAmount,
      required: objDef.requiredAmount,
    });
    
    // Check completion
    if (progress.currentAmount >= objDef.requiredAmount) {
      progress.completed = true;
      progress.completedAt = Date.now();
      
      this.emit('objectiveCompleted', { questId, objectiveId });
      
      // Check quest completion
      this.checkQuestCompletion(questId);
    }
    
    return true;
  }
  
  // Convenience methods for common objective types
  recordKill(targetId: string, count = 1): void {
    for (const update of findObjectiveUpdatesByTarget(this.instances, targetId, ['kill'], count)) {
      this.updateObjective(update.questId, update.objectiveId, update.amount);
    }
  }
  
  recordCollection(itemId: string, count = 1): void {
    for (const update of findObjectiveUpdatesByTarget(this.instances, itemId, ['collect'], count)) {
      this.updateObjective(update.questId, update.objectiveId, update.amount);
    }
  }
  
  recordInteraction(targetId: string): void {
    for (const update of findObjectiveUpdatesByTarget(this.instances, targetId, ['interact', 'talk'])) {
      this.updateObjective(update.questId, update.objectiveId, update.amount);
    }
  }
  
  recordLocationReached(locationId: string): void {
    for (const update of findObjectiveUpdatesByTarget(this.instances, locationId, ['reach', 'explore'])) {
      this.updateObjective(update.questId, update.objectiveId, update.amount);
    }
  }
  
  checkPosition(position: { x: number; y: number; z: number }): void {
    for (const update of findLocationObjectiveUpdates(this.instances, position)) {
      this.updateObjective(update.questId, update.objectiveId, update.amount);
    }
  }
  
  // ============================================================================
  // QUEST STATE
  // ============================================================================
  
  private checkQuestCompletion(questId: string): void {
    const instance = this.instances.get(questId);
    if (!instance || instance.state !== 'active') return;
    
    if (requiredObjectivesComplete(instance)) {
      this.completeQuest(questId);
    }
  }
  
  private unlockQuest(questId: string): void {
    const instance = this.instances.get(questId);
    if (!instance || instance.state !== 'locked') return;
    
    instance.state = 'available';
    
    this.emit('questUnlocked', { questId });
  }
  
  private updateQuestAvailability(): void {
    for (const [questId, instance] of this.instances) {
      if (instance.state !== 'locked') continue;
      
      const prereqs = instance.definition.prerequisites || [];
      const allMet = prereqs.every((id) => this.completedQuests.has(id));
      
      if (allMet) {
        this.unlockQuest(questId);
      }
    }
  }
  
  // ============================================================================
  // TRACKING
  // ============================================================================
  
  trackQuest(questId: string): boolean {
    const instance = this.instances.get(questId);
    if (!instance || instance.state !== 'active') return false;
    
    // Untrack previous
    if (this.trackedQuestId) {
      const prev = this.instances.get(this.trackedQuestId);
      if (prev) prev.tracked = false;
    }
    
    instance.tracked = true;
    this.trackedQuestId = questId;
    
    this.emit('questTracked', { questId });
    
    return true;
  }
  
  untrackQuest(): void {
    if (this.trackedQuestId) {
      const instance = this.instances.get(this.trackedQuestId);
      if (instance) instance.tracked = false;
      
      this.emit('questUntracked', { questId: this.trackedQuestId });
      this.trackedQuestId = null;
    }
  }
  
  private autoSelectTrackedQuest(): void {
    const bestQuest = selectHighestPriorityQuest(this.activeQuestIds, this.instances);
    if (bestQuest) {
      this.trackQuest(bestQuest);
    }
  }
  
  getTrackedQuest(): QuestInstance | null {
    if (!this.trackedQuestId) return null;
    return this.instances.get(this.trackedQuestId) || null;
  }
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  getQuest(questId: string): QuestInstance | undefined {
    return this.instances.get(questId);
  }
  
  getQuestsByState(state: QuestState): QuestInstance[] {
    return Array.from(this.instances.values()).filter((i) => i.state === state);
  }
  
  getQuestsByCategory(category: QuestCategory): QuestInstance[] {
    return Array.from(this.instances.values()).filter(
      (i) => i.definition.category === category
    );
  }
  
  getActiveQuests(): QuestInstance[] {
    return Array.from(this.activeQuestIds)
      .map((id) => this.instances.get(id)!)
      .filter(Boolean);
  }
  
  getAvailableQuests(): QuestInstance[] {
    return this.getQuestsByState('available');
  }
  
  getCompletedQuestIds(): string[] {
    return Array.from(this.completedQuests);
  }
  
  isQuestCompleted(questId: string): boolean {
    return this.completedQuests.has(questId);
  }
  
  // ============================================================================
  // JOURNAL
  // ============================================================================
  
  getJournal(): QuestJournalEntry[] {
    return buildQuestJournal(this.instances.values());
  }
  
  // ============================================================================
  // TIMER CHECKING
  // ============================================================================
  
  startTimerChecks(interval = 1000): void {
    if (this.checkIntervalId) return;
    
    this.checkIntervalId = setInterval(() => {
      this.checkTimers();
    }, interval);
  }
  
  stopTimerChecks(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
  
  private checkTimers(): void {
    for (const questId of findExpiredQuestIds(this.instances)) {
      this.failQuest(questId, 'Time expired');
    }
  }
  
  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  
  save(): string {
    return serializeQuestManagerState({
      completedQuests: this.completedQuests,
      instances: this.instances,
      trackedQuestId: this.trackedQuestId,
    });
  }
  
  load(json: string): void {
    const state = applyQuestManagerState(json, this.instances);
    this.completedQuests = state.completedQuests;
    this.trackedQuestId = state.trackedQuestId;
    this.activeQuestIds = state.activeQuestIds;
    
    this.emit('loaded');
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  setMaxActiveQuests(max: number): void {
    this.maxActiveQuests = max;
  }
  
  dispose(): void {
    this.stopTimerChecks();
    this.definitions.clear();
    this.instances.clear();
    this.completedQuests.clear();
    this.activeQuestIds.clear();
    this.trackedQuestId = null;
    this.removeAllListeners();
  }
}
