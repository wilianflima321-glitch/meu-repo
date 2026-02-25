/**
 * Quest System - Sistema de Quests/Missões
 * 
 * Sistema completo com:
 * - Quest creation and management
 * - Objectives with multiple types
 * - Quest chains/dependencies
 * - Progress tracking
 * - Rewards system integration
 * - Quest journal UI data
 * - Auto-tracking
 * - Quest branching
 * 
 * @module lib/quests/quest-system
 */

import { EventEmitter } from 'events';
import { useState, useRef, useEffect, useContext, createContext, useCallback } from 'react';
import { QuestBuilder } from './quest-builder';

import type {
  ObjectiveDefinition,
  ObjectiveProgress,
  ObjectiveType,
  QuestCategory,
  QuestDefinition,
  QuestInstance,
  QuestJournalEntry,
  QuestPriority,
  QuestReward,
  QuestState,
} from './quest-system-types';
export { QuestBuilder } from './quest-builder';
export type {
  ObjectiveDefinition,
  ObjectiveProgress,
  ObjectiveType,
  QuestCategory,
  QuestDefinition,
  QuestInstance,
  QuestJournalEntry,
  QuestPriority,
  QuestReward,
  QuestState,
} from './quest-system-types';

// ============================================================================
// QUEST MANAGER
// ============================================================================

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
    
    // Create initial instance
    this.instances.set(definition.id, {
      definition,
      state: definition.prerequisites?.length ? 'locked' : 'available',
      objectiveProgress: new Map(
        definition.objectives.map((obj) => [
          obj.id,
          { currentAmount: 0, completed: false },
        ])
      ),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      expiresAt: null,
      tracked: false,
      repeatCount: 0,
    });
    
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
      console.warn(`Quest ${questId} is not available (state: ${instance.state})`);
      return false;
    }
    
    if (this.activeQuestIds.size >= this.maxActiveQuests) {
      console.warn('Maximum active quests reached');
      return false;
    }
    
    instance.state = 'active';
    instance.startedAt = Date.now();
    
    // Set expiration if time limit
    if (instance.definition.timeLimit) {
      instance.expiresAt = instance.startedAt + instance.definition.timeLimit;
    }
    
    // Reset progress
    for (const [objId] of instance.objectiveProgress) {
      instance.objectiveProgress.set(objId, {
        currentAmount: 0,
        completed: false,
      });
    }
    
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
    
    // Check all required objectives completed
    for (const [objId, progress] of instance.objectiveProgress) {
      const objDef = instance.definition.objectives.find((o) => o.id === objId);
      if (objDef && !objDef.optional && !progress.completed) {
        console.warn(`Quest ${questId} has incomplete required objective: ${objId}`);
        return false;
      }
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
    const rewards = this.grantRewards(instance.definition.rewards);
    
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
        instance.state = 'available';
        instance.startedAt = null;
        instance.completedAt = null;
        instance.failedAt = null;
        instance.expiresAt = null;
        
        for (const [objId] of instance.objectiveProgress) {
          instance.objectiveProgress.set(objId, {
            currentAmount: 0,
            completed: false,
          });
        }
        
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
    for (const [questId, instance] of this.instances) {
      if (instance.state !== 'active') continue;
      
      for (const obj of instance.definition.objectives) {
        if (obj.type === 'kill' && obj.target === targetId) {
          this.updateObjective(questId, obj.id, count);
        }
      }
    }
  }
  
  recordCollection(itemId: string, count = 1): void {
    for (const [questId, instance] of this.instances) {
      if (instance.state !== 'active') continue;
      
      for (const obj of instance.definition.objectives) {
        if (obj.type === 'collect' && obj.target === itemId) {
          this.updateObjective(questId, obj.id, count);
        }
      }
    }
  }
  
  recordInteraction(targetId: string): void {
    for (const [questId, instance] of this.instances) {
      if (instance.state !== 'active') continue;
      
      for (const obj of instance.definition.objectives) {
        if (
          (obj.type === 'interact' || obj.type === 'talk') &&
          obj.target === targetId
        ) {
          this.updateObjective(questId, obj.id, 1);
        }
      }
    }
  }
  
  recordLocationReached(locationId: string): void {
    for (const [questId, instance] of this.instances) {
      if (instance.state !== 'active') continue;
      
      for (const obj of instance.definition.objectives) {
        if (
          (obj.type === 'reach' || obj.type === 'explore') &&
          obj.target === locationId
        ) {
          this.updateObjective(questId, obj.id, 1);
        }
      }
    }
  }
  
  checkPosition(position: { x: number; y: number; z: number }): void {
    for (const [questId, instance] of this.instances) {
      if (instance.state !== 'active') continue;
      
      for (const obj of instance.definition.objectives) {
        if (obj.type === 'reach' && obj.location) {
          const dist = Math.sqrt(
            Math.pow(position.x - obj.location.x, 2) +
            Math.pow(position.y - obj.location.y, 2) +
            Math.pow(position.z - obj.location.z, 2)
          );
          
          if (dist <= (obj.location.radius || 5)) {
            this.updateObjective(questId, obj.id, 1);
          }
        }
      }
    }
  }
  
  // ============================================================================
  // QUEST STATE
  // ============================================================================
  
  private checkQuestCompletion(questId: string): void {
    const instance = this.instances.get(questId);
    if (!instance || instance.state !== 'active') return;
    
    let allComplete = true;
    
    for (const [objId, progress] of instance.objectiveProgress) {
      const objDef = instance.definition.objectives.find((o) => o.id === objId);
      if (objDef && !objDef.optional && !progress.completed) {
        allComplete = false;
        break;
      }
    }
    
    if (allComplete) {
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
    // Track highest priority active quest
    let bestQuest: string | null = null;
    let bestPriority = -1;
    
    const priorityOrder: Record<QuestPriority, number> = {
      critical: 3,
      high: 2,
      normal: 1,
      low: 0,
    };
    
    for (const questId of this.activeQuestIds) {
      const instance = this.instances.get(questId);
      if (!instance) continue;
      
      const priority = priorityOrder[instance.definition.priority || 'normal'];
      if (priority > bestPriority) {
        bestPriority = priority;
        bestQuest = questId;
      }
    }
    
    if (bestQuest) {
      this.trackQuest(bestQuest);
    }
  }
  
  getTrackedQuest(): QuestInstance | null {
    if (!this.trackedQuestId) return null;
    return this.instances.get(this.trackedQuestId) || null;
  }
  
  // ============================================================================
  // REWARDS
  // ============================================================================
  
  private grantRewards(rewards: QuestReward[]): QuestReward[] {
    const granted: QuestReward[] = [];
    
    for (const reward of rewards) {
      // In a real implementation, this would integrate with inventory, currency, etc.
      this.emit('rewardGranted', { reward });
      granted.push(reward);
    }
    
    return granted;
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
    const entries: QuestJournalEntry[] = [];
    
    for (const instance of this.instances.values()) {
      if (instance.state !== 'active' && instance.state !== 'completed') continue;
      
      const objectives = instance.definition.objectives
        .filter((obj) => !obj.hidden)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((obj) => ({
          definition: obj,
          progress: instance.objectiveProgress.get(obj.id)!,
        }));
      
      entries.push({
        quest: instance.definition,
        state: instance.state,
        objectives,
        tracked: instance.tracked,
        timeRemaining: instance.expiresAt 
          ? Math.max(0, instance.expiresAt - Date.now())
          : undefined,
      });
    }
    
    // Sort by priority and category
    const priorityOrder: Record<QuestPriority, number> = {
      critical: 3,
      high: 2,
      normal: 1,
      low: 0,
    };
    
    const categoryOrder: Record<QuestCategory, number> = {
      main: 6,
      side: 5,
      daily: 4,
      weekly: 3,
      event: 2,
      repeatable: 1,
      hidden: 0,
    };
    
    entries.sort((a, b) => {
      const pA = priorityOrder[a.quest.priority || 'normal'];
      const pB = priorityOrder[b.quest.priority || 'normal'];
      if (pA !== pB) return pB - pA;
      
      const cA = categoryOrder[a.quest.category];
      const cB = categoryOrder[b.quest.category];
      return cB - cA;
    });
    
    return entries;
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
    const now = Date.now();
    
    for (const [questId, instance] of this.instances) {
      if (instance.state !== 'active') continue;
      
      if (instance.expiresAt && now >= instance.expiresAt) {
        this.failQuest(questId, 'Time expired');
      }
    }
  }
  
  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  
  save(): string {
    const data = {
      completedQuests: Array.from(this.completedQuests),
      instances: Array.from(this.instances.entries()).map(([id, inst]) => ({
        id,
        state: inst.state,
        progress: Array.from(inst.objectiveProgress.entries()),
        startedAt: inst.startedAt,
        completedAt: inst.completedAt,
        failedAt: inst.failedAt,
        expiresAt: inst.expiresAt,
        tracked: inst.tracked,
        repeatCount: inst.repeatCount,
      })),
      trackedQuestId: this.trackedQuestId,
    };
    
    return JSON.stringify(data);
  }
  
  load(json: string): void {
    const data = JSON.parse(json);
    
    this.completedQuests = new Set(data.completedQuests);
    this.trackedQuestId = data.trackedQuestId;
    
    for (const saved of data.instances) {
      const instance = this.instances.get(saved.id);
      if (!instance) continue;
      
      instance.state = saved.state;
      instance.startedAt = saved.startedAt;
      instance.completedAt = saved.completedAt;
      instance.failedAt = saved.failedAt;
      instance.expiresAt = saved.expiresAt;
      instance.tracked = saved.tracked;
      instance.repeatCount = saved.repeatCount;
      
      for (const [objId, progress] of saved.progress) {
        instance.objectiveProgress.set(objId, progress);
      }
      
      if (instance.state === 'active') {
        this.activeQuestIds.add(saved.id);
      }
    }
    
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

// ============================================================================
// REACT HOOKS
// ============================================================================

const QuestContext = createContext<QuestManager | null>(null);

export function QuestProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef<QuestManager>(new QuestManager());
  
  useEffect(() => {
    const manager = managerRef.current;
    manager.startTimerChecks();
    
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <QuestContext.Provider value={managerRef.current}>
      {children}
    </QuestContext.Provider>
  );
}

export function useQuests() {
  const manager = useContext(QuestContext);
  if (!manager) {
    throw new Error('useQuests must be used within a QuestProvider');
  }
  
  const [journal, setJournal] = useState<QuestJournalEntry[]>([]);
  const [trackedQuest, setTrackedQuest] = useState<QuestInstance | null>(null);
  
  useEffect(() => {
    const updateJournal = () => setJournal(manager.getJournal());
    const updateTracked = () => setTrackedQuest(manager.getTrackedQuest());
    
    const events = [
      'questStarted',
      'questCompleted',
      'questFailed',
      'questAbandoned',
      'questTurnedIn',
      'objectiveProgress',
      'questTracked',
      'questUntracked',
    ];
    
    for (const event of events) {
      manager.on(event, updateJournal);
      manager.on(event, updateTracked);
    }
    
    updateJournal();
    updateTracked();
    
    return () => {
      for (const event of events) {
        manager.off(event, updateJournal);
        manager.off(event, updateTracked);
      }
    };
  }, [manager]);
  
  const startQuest = useCallback((questId: string) => {
    return manager.startQuest(questId);
  }, [manager]);
  
  const abandonQuest = useCallback((questId: string) => {
    return manager.abandonQuest(questId);
  }, [manager]);
  
  const turnInQuest = useCallback((questId: string) => {
    return manager.turnInQuest(questId);
  }, [manager]);
  
  const trackQuest = useCallback((questId: string) => {
    return manager.trackQuest(questId);
  }, [manager]);
  
  return {
    manager,
    journal,
    trackedQuest,
    activeQuests: manager.getActiveQuests(),
    availableQuests: manager.getAvailableQuests(),
    startQuest,
    abandonQuest,
    turnInQuest,
    trackQuest,
    untrackQuest: manager.untrackQuest.bind(manager),
    registerQuest: manager.registerQuest.bind(manager),
    registerQuests: manager.registerQuests.bind(manager),
  };
}

export function useQuestProgress(questId: string) {
  const { manager } = useQuests();
  const [quest, setQuest] = useState<QuestInstance | undefined>(manager.getQuest(questId));
  
  useEffect(() => {
    const update = ({ questId: id }: { questId: string }) => {
      if (id === questId) {
        setQuest(manager.getQuest(questId));
      }
    };
    
    manager.on('objectiveProgress', update);
    manager.on('questStarted', update);
    manager.on('questCompleted', update);
    
    return () => {
      manager.off('objectiveProgress', update);
      manager.off('questStarted', update);
      manager.off('questCompleted', update);
    };
  }, [manager, questId]);
  
  return quest;
}

const __defaultExport = {
  QuestManager,
  QuestBuilder,
  QuestProvider,
  useQuests,
  useQuestProgress,
};

export default __defaultExport;
