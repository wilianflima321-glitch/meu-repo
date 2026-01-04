/**
 * QUEST & MISSION SYSTEM - Aethel Engine
 * 
 * Sistema profissional completo de quests e missões para jogos AAA.
 * 
 * FEATURES:
 * - Quest state machine
 * - Multi-objective support
 * - Branching quest chains
 * - Dynamic rewards
 * - Quest tracking
 * - Journal system
 * - Quest markers/waypoints
 * - Save/load progress
 * - Event-driven updates
 * - Time-limited quests
 * - Repeatable quests
 * - Quest prerequisites
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export enum QuestState {
  UNKNOWN = 'unknown',
  AVAILABLE = 'available',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TURNED_IN = 'turned_in',
}

export enum ObjectiveState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ObjectiveType {
  COLLECT = 'collect',
  KILL = 'kill',
  TALK = 'talk',
  REACH = 'reach',
  INTERACT = 'interact',
  ESCORT = 'escort',
  DEFEND = 'defend',
  TIMER = 'timer',
  CUSTOM = 'custom',
}

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  localizedDescription?: Record<string, string>;
  
  // Target
  targetId?: string;
  targetLocation?: THREE.Vector3;
  targetRadius?: number;
  
  // Progress
  currentCount: number;
  requiredCount: number;
  
  // State
  state: ObjectiveState;
  optional: boolean;
  hidden: boolean;
  
  // Order
  order?: number;
  prerequisites?: string[]; // Other objective IDs
  
  // Custom data
  customData?: any;
}

export interface QuestReward {
  type: 'experience' | 'currency' | 'item' | 'reputation' | 'skill' | 'unlock' | 'custom';
  id?: string;
  amount?: number;
  data?: any;
}

export interface QuestPrerequisite {
  type: 'quest_completed' | 'level' | 'reputation' | 'item' | 'flag' | 'custom';
  target: string;
  value?: any;
}

export interface Quest {
  id: string;
  name: string;
  localizedName?: Record<string, string>;
  description: string;
  localizedDescription?: Record<string, string>;
  category: string;
  
  // State
  state: QuestState;
  
  // NPCs
  questGiverId?: string;
  turnInId?: string;
  
  // Objectives
  objectives: Map<string, QuestObjective>;
  
  // Rewards
  rewards: QuestReward[];
  
  // Requirements
  prerequisites: QuestPrerequisite[];
  requiredLevel?: number;
  
  // Settings
  repeatable: boolean;
  repeatCooldown?: number; // ms
  lastCompletedTime?: number;
  
  timeLimit?: number; // ms
  startTime?: number;
  
  // Chain
  chainId?: string;
  chainOrder?: number;
  nextQuestId?: string;
  
  // Visual
  icon?: string;
  markerColor?: string;
  priority: number;
  
  // Tracking
  isTracked: boolean;
}

export interface QuestChain {
  id: string;
  name: string;
  quests: string[];
  currentQuestIndex: number;
}

export interface QuestMarker {
  questId: string;
  objectiveId?: string;
  position: THREE.Vector3;
  type: 'quest_giver' | 'objective' | 'turn_in';
  icon: string;
  color: string;
}

export interface QuestJournalEntry {
  questId: string;
  timestamp: number;
  entry: string;
  type: 'started' | 'objective' | 'completed' | 'failed' | 'note';
}

// ============================================================================
// QUEST MANAGER
// ============================================================================

export class QuestManager {
  private quests: Map<string, Quest> = new Map();
  private chains: Map<string, QuestChain> = new Map();
  private journal: QuestJournalEntry[] = [];
  private markers: Map<string, QuestMarker[]> = new Map();
  
  private currentLanguage: string = 'en';
  private maxTrackedQuests: number = 5;
  
  // Callbacks
  private onQuestStateChange?: (quest: Quest, oldState: QuestState) => void;
  private onObjectiveProgress?: (quest: Quest, objective: QuestObjective) => void;
  private onObjectiveComplete?: (quest: Quest, objective: QuestObjective) => void;
  private onQuestComplete?: (quest: Quest) => void;
  private onQuestFailed?: (quest: Quest) => void;
  private onRewardGranted?: (quest: Quest, reward: QuestReward) => void;
  
  // External providers
  private prerequisiteChecker?: (prereq: QuestPrerequisite) => boolean;
  private rewardGranter?: (reward: QuestReward) => void;
  
  constructor() {}
  
  // ========================================
  // QUEST REGISTRATION
  // ========================================
  
  registerQuest(quest: Quest): void {
    this.quests.set(quest.id, quest);
    this.updateMarkers(quest);
  }
  
  registerChain(chain: QuestChain): void {
    this.chains.set(chain.id, chain);
  }
  
  loadFromJSON(json: any): Quest {
    const quest: Quest = {
      id: json.id,
      name: json.name,
      localizedName: json.localizedName,
      description: json.description,
      localizedDescription: json.localizedDescription,
      category: json.category || 'main',
      state: QuestState.UNKNOWN,
      objectives: new Map(),
      rewards: json.rewards || [],
      prerequisites: json.prerequisites || [],
      requiredLevel: json.requiredLevel,
      repeatable: json.repeatable || false,
      repeatCooldown: json.repeatCooldown,
      timeLimit: json.timeLimit,
      chainId: json.chainId,
      chainOrder: json.chainOrder,
      nextQuestId: json.nextQuestId,
      icon: json.icon,
      markerColor: json.markerColor || '#ffcc00',
      priority: json.priority || 0,
      isTracked: false,
      questGiverId: json.questGiverId,
      turnInId: json.turnInId,
    };
    
    // Parse objectives
    for (const objData of json.objectives || []) {
      const objective: QuestObjective = {
        ...objData,
        currentCount: 0,
        state: ObjectiveState.INACTIVE,
        targetLocation: objData.targetLocation ? 
          new THREE.Vector3(objData.targetLocation.x, objData.targetLocation.y, objData.targetLocation.z) :
          undefined,
      };
      quest.objectives.set(objective.id, objective);
    }
    
    this.registerQuest(quest);
    return quest;
  }
  
  // ========================================
  // QUEST AVAILABILITY
  // ========================================
  
  checkAvailability(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;
    
    // Already completed non-repeatable
    if (quest.state === QuestState.TURNED_IN && !quest.repeatable) {
      return false;
    }
    
    // On cooldown
    if (quest.repeatable && quest.lastCompletedTime) {
      const cooldownEnd = quest.lastCompletedTime + (quest.repeatCooldown || 0);
      if (Date.now() < cooldownEnd) return false;
    }
    
    // Check prerequisites
    for (const prereq of quest.prerequisites) {
      if (!this.checkPrerequisite(prereq)) return false;
    }
    
    return true;
  }
  
  private checkPrerequisite(prereq: QuestPrerequisite): boolean {
    if (this.prerequisiteChecker) {
      return this.prerequisiteChecker(prereq);
    }
    
    // Default handling
    switch (prereq.type) {
      case 'quest_completed':
        const prereqQuest = this.quests.get(prereq.target);
        return prereqQuest?.state === QuestState.TURNED_IN;
      default:
        return true;
    }
  }
  
  updateAllAvailability(): void {
    for (const quest of this.quests.values()) {
      if (quest.state === QuestState.UNKNOWN) {
        if (this.checkAvailability(quest.id)) {
          this.setQuestState(quest.id, QuestState.AVAILABLE);
        }
      }
    }
  }
  
  // ========================================
  // QUEST LIFECYCLE
  // ========================================
  
  startQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;
    
    if (quest.state !== QuestState.AVAILABLE) {
      if (!this.checkAvailability(questId)) return false;
    }
    
    const oldState = quest.state;
    quest.state = QuestState.ACTIVE;
    
    // Start timer if time-limited
    if (quest.timeLimit) {
      quest.startTime = Date.now();
    }
    
    // Activate first objectives
    this.activateInitialObjectives(quest);
    
    // Journal entry
    this.addJournalEntry(questId, 'started', `Quest started: ${this.getQuestName(quest)}`);
    
    // Track if possible
    if (this.getTrackedQuests().length < this.maxTrackedQuests) {
      quest.isTracked = true;
    }
    
    this.updateMarkers(quest);
    this.onQuestStateChange?.(quest, oldState);
    
    return true;
  }
  
  private activateInitialObjectives(quest: Quest): void {
    for (const [_, obj] of quest.objectives) {
      if (!obj.prerequisites || obj.prerequisites.length === 0) {
        obj.state = ObjectiveState.ACTIVE;
      }
    }
  }
  
  completeQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    
    // Check all required objectives completed
    for (const [_, obj] of quest.objectives) {
      if (!obj.optional && obj.state !== ObjectiveState.COMPLETED) {
        return false;
      }
    }
    
    const oldState = quest.state;
    quest.state = QuestState.COMPLETED;
    
    this.addJournalEntry(questId, 'completed', `Quest completed: ${this.getQuestName(quest)}`);
    this.updateMarkers(quest);
    this.onQuestStateChange?.(quest, oldState);
    this.onQuestComplete?.(quest);
    
    return true;
  }
  
  turnInQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.COMPLETED) return false;
    
    const oldState = quest.state;
    quest.state = QuestState.TURNED_IN;
    quest.isTracked = false;
    quest.lastCompletedTime = Date.now();
    
    // Grant rewards
    for (const reward of quest.rewards) {
      this.grantReward(quest, reward);
    }
    
    // Start next quest in chain
    if (quest.nextQuestId) {
      this.setQuestState(quest.nextQuestId, QuestState.AVAILABLE);
    }
    
    this.updateMarkers(quest);
    this.onQuestStateChange?.(quest, oldState);
    
    // Update availability for other quests
    this.updateAllAvailability();
    
    return true;
  }
  
  failQuest(questId: string, reason?: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    
    const oldState = quest.state;
    quest.state = QuestState.FAILED;
    quest.isTracked = false;
    
    this.addJournalEntry(questId, 'failed', 
      `Quest failed: ${this.getQuestName(quest)}${reason ? ` - ${reason}` : ''}`);
    
    this.updateMarkers(quest);
    this.onQuestStateChange?.(quest, oldState);
    this.onQuestFailed?.(quest);
    
    return true;
  }
  
  abandonQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    
    // Reset objectives
    for (const [_, obj] of quest.objectives) {
      obj.currentCount = 0;
      obj.state = ObjectiveState.INACTIVE;
    }
    
    const oldState = quest.state;
    quest.state = QuestState.AVAILABLE;
    quest.isTracked = false;
    quest.startTime = undefined;
    
    this.updateMarkers(quest);
    this.onQuestStateChange?.(quest, oldState);
    
    return true;
  }
  
  private setQuestState(questId: string, state: QuestState): void {
    const quest = this.quests.get(questId);
    if (!quest) return;
    
    const oldState = quest.state;
    quest.state = state;
    this.updateMarkers(quest);
    this.onQuestStateChange?.(quest, oldState);
  }
  
  // ========================================
  // OBJECTIVE PROGRESS
  // ========================================
  
  updateObjective(questId: string, objectiveId: string, progress: number): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    
    const objective = quest.objectives.get(objectiveId);
    if (!objective || objective.state !== ObjectiveState.ACTIVE) return false;
    
    objective.currentCount = Math.min(progress, objective.requiredCount);
    
    this.onObjectiveProgress?.(quest, objective);
    
    // Check completion
    if (objective.currentCount >= objective.requiredCount) {
      this.completeObjective(questId, objectiveId);
    }
    
    return true;
  }
  
  addObjectiveProgress(questId: string, objectiveId: string, amount: number = 1): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;
    
    const objective = quest.objectives.get(objectiveId);
    if (!objective) return false;
    
    return this.updateObjective(questId, objectiveId, objective.currentCount + amount);
  }
  
  completeObjective(questId: string, objectiveId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    
    const objective = quest.objectives.get(objectiveId);
    if (!objective || objective.state === ObjectiveState.COMPLETED) return false;
    
    objective.state = ObjectiveState.COMPLETED;
    objective.currentCount = objective.requiredCount;
    
    this.addJournalEntry(questId, 'objective', 
      `Objective completed: ${this.getObjectiveDescription(objective)}`);
    
    this.onObjectiveComplete?.(quest, objective);
    
    // Activate dependent objectives
    for (const [_, obj] of quest.objectives) {
      if (obj.state === ObjectiveState.INACTIVE && obj.prerequisites) {
        const allPrereqsMet = obj.prerequisites.every(prereqId => {
          const prereqObj = quest.objectives.get(prereqId);
          return prereqObj?.state === ObjectiveState.COMPLETED;
        });
        
        if (allPrereqsMet) {
          obj.state = ObjectiveState.ACTIVE;
        }
      }
    }
    
    // Check quest completion
    this.checkQuestCompletion(questId);
    
    this.updateMarkers(quest);
    
    return true;
  }
  
  failObjective(questId: string, objectiveId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    
    const objective = quest.objectives.get(objectiveId);
    if (!objective) return false;
    
    objective.state = ObjectiveState.FAILED;
    
    // Non-optional failed = quest failed
    if (!objective.optional) {
      this.failQuest(questId, `Failed objective: ${this.getObjectiveDescription(objective)}`);
    }
    
    return true;
  }
  
  private checkQuestCompletion(questId: string): void {
    const quest = this.quests.get(questId);
    if (!quest) return;
    
    // All required objectives must be completed
    let allComplete = true;
    for (const [_, obj] of quest.objectives) {
      if (!obj.optional && obj.state !== ObjectiveState.COMPLETED) {
        allComplete = false;
        break;
      }
    }
    
    if (allComplete) {
      this.completeQuest(questId);
    }
  }
  
  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  // Call when player kills enemy
  onEnemyKilled(enemyId: string, enemyType: string): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      
      for (const [objId, obj] of quest.objectives) {
        if (obj.state !== ObjectiveState.ACTIVE) continue;
        if (obj.type !== ObjectiveType.KILL) continue;
        
        if (obj.targetId === enemyId || obj.targetId === enemyType) {
          this.addObjectiveProgress(questId, objId);
        }
      }
    }
  }
  
  // Call when player collects item
  onItemCollected(itemId: string, amount: number = 1): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      
      for (const [objId, obj] of quest.objectives) {
        if (obj.state !== ObjectiveState.ACTIVE) continue;
        if (obj.type !== ObjectiveType.COLLECT) continue;
        
        if (obj.targetId === itemId) {
          this.addObjectiveProgress(questId, objId, amount);
        }
      }
    }
  }
  
  // Call when player talks to NPC
  onNPCTalked(npcId: string): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      
      for (const [objId, obj] of quest.objectives) {
        if (obj.state !== ObjectiveState.ACTIVE) continue;
        if (obj.type !== ObjectiveType.TALK) continue;
        
        if (obj.targetId === npcId) {
          this.completeObjective(questId, objId);
        }
      }
    }
  }
  
  // Call when player reaches location
  onLocationReached(position: THREE.Vector3): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      
      for (const [objId, obj] of quest.objectives) {
        if (obj.state !== ObjectiveState.ACTIVE) continue;
        if (obj.type !== ObjectiveType.REACH) continue;
        
        if (obj.targetLocation) {
          const distance = position.distanceTo(obj.targetLocation);
          if (distance <= (obj.targetRadius || 5)) {
            this.completeObjective(questId, objId);
          }
        }
      }
    }
  }
  
  // Call when player interacts with object
  onObjectInteracted(objectId: string): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      
      for (const [objId, obj] of quest.objectives) {
        if (obj.state !== ObjectiveState.ACTIVE) continue;
        if (obj.type !== ObjectiveType.INTERACT) continue;
        
        if (obj.targetId === objectId) {
          this.completeObjective(questId, objId);
        }
      }
    }
  }
  
  // Custom event
  onCustomEvent(eventName: string, data: any): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      
      for (const [objId, obj] of quest.objectives) {
        if (obj.state !== ObjectiveState.ACTIVE) continue;
        if (obj.type !== ObjectiveType.CUSTOM) continue;
        
        if (obj.customData?.eventName === eventName) {
          // Check if data matches
          const matcher = obj.customData?.matcher;
          if (!matcher || matcher(data)) {
            this.addObjectiveProgress(questId, objId);
          }
        }
      }
    }
  }
  
  // ========================================
  // TIME MANAGEMENT
  // ========================================
  
  update(deltaTime: number): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      
      // Check time limit
      if (quest.timeLimit && quest.startTime) {
        const elapsed = Date.now() - quest.startTime;
        if (elapsed >= quest.timeLimit) {
          this.failQuest(questId, 'Time limit exceeded');
        }
      }
      
      // Update timer objectives
      for (const [objId, obj] of quest.objectives) {
        if (obj.state !== ObjectiveState.ACTIVE) continue;
        if (obj.type !== ObjectiveType.TIMER) continue;
        
        this.addObjectiveProgress(questId, objId, deltaTime);
      }
    }
  }
  
  getRemainingTime(questId: string): number | null {
    const quest = this.quests.get(questId);
    if (!quest || !quest.timeLimit || !quest.startTime) return null;
    
    const elapsed = Date.now() - quest.startTime;
    return Math.max(0, quest.timeLimit - elapsed);
  }
  
  // ========================================
  // REWARDS
  // ========================================
  
  private grantReward(quest: Quest, reward: QuestReward): void {
    if (this.rewardGranter) {
      this.rewardGranter(reward);
    }
    
    this.onRewardGranted?.(quest, reward);
  }
  
  // ========================================
  // MARKERS
  // ========================================
  
  private updateMarkers(quest: Quest): void {
    const markers: QuestMarker[] = [];
    
    if (quest.state === QuestState.AVAILABLE && quest.questGiverId) {
      // Quest giver marker
      // Position would come from NPC manager
      markers.push({
        questId: quest.id,
        position: new THREE.Vector3(), // Get from NPC
        type: 'quest_giver',
        icon: '!',
        color: quest.markerColor || '#ffcc00',
      });
    }
    
    if (quest.state === QuestState.ACTIVE) {
      // Objective markers
      for (const [objId, obj] of quest.objectives) {
        if (obj.state !== ObjectiveState.ACTIVE) continue;
        if (obj.hidden) continue;
        
        if (obj.targetLocation) {
          markers.push({
            questId: quest.id,
            objectiveId: objId,
            position: obj.targetLocation,
            type: 'objective',
            icon: '◆',
            color: quest.markerColor || '#ffcc00',
          });
        }
      }
    }
    
    if (quest.state === QuestState.COMPLETED && quest.turnInId) {
      // Turn in marker
      markers.push({
        questId: quest.id,
        position: new THREE.Vector3(), // Get from NPC
        type: 'turn_in',
        icon: '?',
        color: '#00ff00',
      });
    }
    
    this.markers.set(quest.id, markers);
  }
  
  getMarkers(questId?: string): QuestMarker[] {
    if (questId) {
      return this.markers.get(questId) || [];
    }
    
    const allMarkers: QuestMarker[] = [];
    for (const markers of this.markers.values()) {
      allMarkers.push(...markers);
    }
    return allMarkers;
  }
  
  getTrackedMarkers(): QuestMarker[] {
    const markers: QuestMarker[] = [];
    for (const quest of this.quests.values()) {
      if (quest.isTracked) {
        markers.push(...(this.markers.get(quest.id) || []));
      }
    }
    return markers;
  }
  
  // ========================================
  // JOURNAL
  // ========================================
  
  private addJournalEntry(questId: string, type: QuestJournalEntry['type'], entry: string): void {
    this.journal.push({
      questId,
      timestamp: Date.now(),
      entry,
      type,
    });
  }
  
  addNote(questId: string, note: string): void {
    this.addJournalEntry(questId, 'note', note);
  }
  
  getJournal(questId?: string): QuestJournalEntry[] {
    if (questId) {
      return this.journal.filter(e => e.questId === questId);
    }
    return [...this.journal];
  }
  
  // ========================================
  // TRACKING
  // ========================================
  
  trackQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    
    const tracked = this.getTrackedQuests();
    if (tracked.length >= this.maxTrackedQuests) {
      // Untrack oldest
      tracked[0].isTracked = false;
    }
    
    quest.isTracked = true;
    return true;
  }
  
  untrackQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;
    
    quest.isTracked = false;
    return true;
  }
  
  getTrackedQuests(): Quest[] {
    return Array.from(this.quests.values())
      .filter(q => q.isTracked)
      .sort((a, b) => b.priority - a.priority);
  }
  
  // ========================================
  // GETTERS
  // ========================================
  
  getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }
  
  getQuestsByState(state: QuestState): Quest[] {
    return Array.from(this.quests.values()).filter(q => q.state === state);
  }
  
  getQuestsByCategory(category: string): Quest[] {
    return Array.from(this.quests.values()).filter(q => q.category === category);
  }
  
  getActiveQuests(): Quest[] {
    return this.getQuestsByState(QuestState.ACTIVE);
  }
  
  getAvailableQuests(): Quest[] {
    return this.getQuestsByState(QuestState.AVAILABLE);
  }
  
  getCompletedQuests(): Quest[] {
    return [...this.getQuestsByState(QuestState.COMPLETED), 
            ...this.getQuestsByState(QuestState.TURNED_IN)];
  }
  
  getQuestName(quest: Quest): string {
    if (quest.localizedName?.[this.currentLanguage]) {
      return quest.localizedName[this.currentLanguage];
    }
    return quest.name;
  }
  
  getQuestDescription(quest: Quest): string {
    if (quest.localizedDescription?.[this.currentLanguage]) {
      return quest.localizedDescription[this.currentLanguage];
    }
    return quest.description;
  }
  
  getObjectiveDescription(obj: QuestObjective): string {
    if (obj.localizedDescription?.[this.currentLanguage]) {
      return obj.localizedDescription[this.currentLanguage];
    }
    return obj.description;
  }
  
  getObjectiveProgress(questId: string, objectiveId: string): { current: number; required: number } | null {
    const quest = this.quests.get(questId);
    if (!quest) return null;
    
    const obj = quest.objectives.get(objectiveId);
    if (!obj) return null;
    
    return {
      current: obj.currentCount,
      required: obj.requiredCount,
    };
  }
  
  // ========================================
  // CONFIGURATION
  // ========================================
  
  setLanguage(language: string): void {
    this.currentLanguage = language;
  }
  
  setMaxTrackedQuests(max: number): void {
    this.maxTrackedQuests = max;
  }
  
  setPrerequisiteChecker(checker: (prereq: QuestPrerequisite) => boolean): void {
    this.prerequisiteChecker = checker;
  }
  
  setRewardGranter(granter: (reward: QuestReward) => void): void {
    this.rewardGranter = granter;
  }
  
  // ========================================
  // CALLBACKS
  // ========================================
  
  setOnQuestStateChange(callback: (quest: Quest, oldState: QuestState) => void): void {
    this.onQuestStateChange = callback;
  }
  
  setOnObjectiveProgress(callback: (quest: Quest, objective: QuestObjective) => void): void {
    this.onObjectiveProgress = callback;
  }
  
  setOnObjectiveComplete(callback: (quest: Quest, objective: QuestObjective) => void): void {
    this.onObjectiveComplete = callback;
  }
  
  setOnQuestComplete(callback: (quest: Quest) => void): void {
    this.onQuestComplete = callback;
  }
  
  setOnQuestFailed(callback: (quest: Quest) => void): void {
    this.onQuestFailed = callback;
  }
  
  setOnRewardGranted(callback: (quest: Quest, reward: QuestReward) => void): void {
    this.onRewardGranted = callback;
  }
  
  // ========================================
  // SAVE/LOAD
  // ========================================
  
  serialize(): string {
    const data = {
      quests: Array.from(this.quests.entries()).map(([id, quest]) => ({
        id,
        state: quest.state,
        isTracked: quest.isTracked,
        startTime: quest.startTime,
        lastCompletedTime: quest.lastCompletedTime,
        objectives: Array.from(quest.objectives.entries()).map(([objId, obj]) => ({
          id: objId,
          currentCount: obj.currentCount,
          state: obj.state,
        })),
      })),
      journal: this.journal,
    };
    
    return JSON.stringify(data);
  }
  
  deserialize(json: string): void {
    const data = JSON.parse(json);
    
    for (const questData of data.quests) {
      const quest = this.quests.get(questData.id);
      if (!quest) continue;
      
      quest.state = questData.state;
      quest.isTracked = questData.isTracked;
      quest.startTime = questData.startTime;
      quest.lastCompletedTime = questData.lastCompletedTime;
      
      for (const objData of questData.objectives) {
        const obj = quest.objectives.get(objData.id);
        if (!obj) continue;
        
        obj.currentCount = objData.currentCount;
        obj.state = objData.state;
      }
      
      this.updateMarkers(quest);
    }
    
    this.journal = data.journal;
  }
}

// ============================================================================
// QUEST UI RENDERER
// ============================================================================

export class QuestUIRenderer {
  private container: HTMLDivElement;
  private trackerContainer: HTMLDivElement;
  private journalContainer: HTMLDivElement;
  
  private questManager: QuestManager;
  private isJournalOpen: boolean = false;
  
  constructor(questManager: QuestManager) {
    this.questManager = questManager;
    
    this.container = this.createContainer();
    this.trackerContainer = this.createTrackerContainer();
    this.journalContainer = this.createJournalContainer();
    
    this.container.appendChild(this.trackerContainer);
    this.container.appendChild(this.journalContainer);
    document.body.appendChild(this.container);
    
    this.setupCallbacks();
  }
  
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'quest-ui';
    container.style.cssText = `
      position: fixed;
      z-index: 900;
      font-family: 'Arial', sans-serif;
      pointer-events: none;
    `;
    return container;
  }
  
  private createTrackerContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'quest-tracker';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      pointer-events: auto;
    `;
    return container;
  }
  
  private createJournalContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'quest-journal';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 500px;
      background: rgba(20, 20, 40, 0.95);
      border: 2px solid rgba(100, 150, 255, 0.5);
      border-radius: 10px;
      display: none;
      pointer-events: auto;
    `;
    return container;
  }
  
  private setupCallbacks(): void {
    this.questManager.setOnQuestStateChange(() => this.updateTracker());
    this.questManager.setOnObjectiveProgress(() => this.updateTracker());
    this.questManager.setOnObjectiveComplete(() => this.updateTracker());
  }
  
  updateTracker(): void {
    this.trackerContainer.innerHTML = '';
    
    const tracked = this.questManager.getTrackedQuests();
    
    for (const quest of tracked) {
      const questElement = document.createElement('div');
      questElement.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        border-left: 3px solid ${quest.markerColor || '#ffcc00'};
        padding: 10px 15px;
        margin-bottom: 10px;
        border-radius: 5px;
      `;
      
      // Quest name
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'color: #ffcc00; font-weight: bold; margin-bottom: 5px;';
      nameEl.textContent = this.questManager.getQuestName(quest);
      questElement.appendChild(nameEl);
      
      // Time remaining
      const remainingTime = this.questManager.getRemainingTime(quest.id);
      if (remainingTime !== null) {
        const timeEl = document.createElement('div');
        timeEl.style.cssText = 'color: #ff6666; font-size: 12px; margin-bottom: 5px;';
        timeEl.textContent = `Time: ${this.formatTime(remainingTime)}`;
        questElement.appendChild(timeEl);
      }
      
      // Objectives
      for (const [_, obj] of quest.objectives) {
        if (obj.hidden || obj.state === ObjectiveState.INACTIVE) continue;
        
        const objEl = document.createElement('div');
        objEl.style.cssText = `
          color: ${obj.state === ObjectiveState.COMPLETED ? '#66ff66' : '#ffffff'};
          font-size: 14px;
          padding-left: 10px;
          margin-top: 3px;
        `;
        
        const checkbox = obj.state === ObjectiveState.COMPLETED ? '☑' : '☐';
        const progress = obj.requiredCount > 1 ? ` (${obj.currentCount}/${obj.requiredCount})` : '';
        objEl.textContent = `${checkbox} ${this.questManager.getObjectiveDescription(obj)}${progress}`;
        
        questElement.appendChild(objEl);
      }
      
      this.trackerContainer.appendChild(questElement);
    }
  }
  
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }
  
  openJournal(): void {
    this.isJournalOpen = true;
    this.journalContainer.style.display = 'block';
    this.renderJournal();
  }
  
  closeJournal(): void {
    this.isJournalOpen = false;
    this.journalContainer.style.display = 'none';
  }
  
  toggleJournal(): void {
    if (this.isJournalOpen) {
      this.closeJournal();
    } else {
      this.openJournal();
    }
  }
  
  private renderJournal(): void {
    this.journalContainer.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid rgba(100, 150, 255, 0.3);
    `;
    
    const title = document.createElement('h2');
    title.style.cssText = 'color: #ffcc00; margin: 0;';
    title.textContent = 'Quest Journal';
    header.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
    `;
    closeBtn.textContent = '×';
    closeBtn.onclick = () => this.closeJournal();
    header.appendChild(closeBtn);
    
    this.journalContainer.appendChild(header);
    
    // Tabs
    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display: flex;
      padding: 10px 20px;
      gap: 10px;
    `;
    
    const categories = ['Active', 'Available', 'Completed'];
    for (const cat of categories) {
      const tab = document.createElement('button');
      tab.style.cssText = `
        background: rgba(50, 80, 150, 0.5);
        border: 1px solid rgba(100, 150, 255, 0.3);
        color: white;
        padding: 8px 20px;
        border-radius: 5px;
        cursor: pointer;
      `;
      tab.textContent = cat;
      tab.onclick = () => this.renderQuestList(cat.toLowerCase());
      tabs.appendChild(tab);
    }
    
    this.journalContainer.appendChild(tabs);
    
    // Quest list
    const listContainer = document.createElement('div');
    listContainer.id = 'quest-list';
    listContainer.style.cssText = `
      padding: 20px;
      height: calc(100% - 120px);
      overflow-y: auto;
    `;
    this.journalContainer.appendChild(listContainer);
    
    // Default to active quests
    this.renderQuestList('active');
  }
  
  private renderQuestList(category: string): void {
    const listContainer = document.getElementById('quest-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    let quests: Quest[];
    switch (category) {
      case 'active':
        quests = this.questManager.getActiveQuests();
        break;
      case 'available':
        quests = this.questManager.getAvailableQuests();
        break;
      case 'completed':
        quests = this.questManager.getCompletedQuests();
        break;
      default:
        quests = [];
    }
    
    if (quests.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color: #888; text-align: center; padding: 40px;';
      empty.textContent = 'No quests in this category';
      listContainer.appendChild(empty);
      return;
    }
    
    for (const quest of quests) {
      const questEl = document.createElement('div');
      questEl.style.cssText = `
        background: rgba(30, 30, 60, 0.8);
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        cursor: pointer;
      `;
      
      questEl.onmouseenter = () => {
        questEl.style.borderColor = 'rgba(150, 200, 255, 0.6)';
      };
      
      questEl.onmouseleave = () => {
        questEl.style.borderColor = 'rgba(100, 150, 255, 0.3)';
      };
      
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'color: #ffcc00; font-weight: bold; font-size: 16px;';
      nameEl.textContent = this.questManager.getQuestName(quest);
      questEl.appendChild(nameEl);
      
      const descEl = document.createElement('div');
      descEl.style.cssText = 'color: #ccc; font-size: 14px; margin-top: 5px;';
      descEl.textContent = this.questManager.getQuestDescription(quest);
      questEl.appendChild(descEl);
      
      // Track button for active quests
      if (category === 'active') {
        const trackBtn = document.createElement('button');
        trackBtn.style.cssText = `
          background: ${quest.isTracked ? 'rgba(100, 200, 100, 0.5)' : 'rgba(100, 100, 100, 0.5)'};
          border: none;
          color: white;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          margin-top: 10px;
        `;
        trackBtn.textContent = quest.isTracked ? 'Tracked' : 'Track';
        trackBtn.onclick = (e) => {
          e.stopPropagation();
          if (quest.isTracked) {
            this.questManager.untrackQuest(quest.id);
          } else {
            this.questManager.trackQuest(quest.id);
          }
          this.renderQuestList(category);
          this.updateTracker();
        };
        questEl.appendChild(trackBtn);
      }
      
      listContainer.appendChild(questEl);
    }
  }
}

// ============================================================================
// QUEST MARKER RENDERER (3D)
// ============================================================================

export class QuestMarkerRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private markers: Map<string, THREE.Group> = new Map();
  
  private questManager: QuestManager;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, questManager: QuestManager) {
    this.scene = scene;
    this.camera = camera;
    this.questManager = questManager;
  }
  
  update(): void {
    const activeMarkers = this.questManager.getTrackedMarkers();
    const activeIds = new Set(activeMarkers.map(m => `${m.questId}-${m.objectiveId || 'main'}`));
    
    // Remove old markers
    for (const [id, group] of this.markers) {
      if (!activeIds.has(id)) {
        this.scene.remove(group);
        this.markers.delete(id);
      }
    }
    
    // Add/update markers
    for (const marker of activeMarkers) {
      const id = `${marker.questId}-${marker.objectiveId || 'main'}`;
      
      if (!this.markers.has(id)) {
        const group = this.createMarkerMesh(marker);
        this.scene.add(group);
        this.markers.set(id, group);
      }
      
      // Update position
      const group = this.markers.get(id)!;
      group.position.copy(marker.position);
      group.position.y += 2; // Float above ground
      
      // Billboard - face camera
      group.lookAt(this.camera.position);
    }
    
    // Animate markers
    const time = Date.now() * 0.001;
    for (const group of this.markers.values()) {
      group.position.y += Math.sin(time * 2) * 0.002; // Gentle bob
    }
  }
  
  private createMarkerMesh(marker: QuestMarker): THREE.Group {
    const group = new THREE.Group();
    
    // Create sprite
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Background circle
    ctx.fillStyle = marker.color;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker.icon, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.5, 1);
    
    group.add(sprite);
    
    return group;
  }
  
  dispose(): void {
    for (const group of this.markers.values()) {
      this.scene.remove(group);
    }
    this.markers.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const createQuestManager = (): QuestManager => {
  return new QuestManager();
};

export const createQuestUI = (questManager: QuestManager): QuestUIRenderer => {
  return new QuestUIRenderer(questManager);
};

export const createQuestMarkerRenderer = (
  scene: THREE.Scene,
  camera: THREE.Camera,
  questManager: QuestManager
): QuestMarkerRenderer => {
  return new QuestMarkerRenderer(scene, camera, questManager);
};
