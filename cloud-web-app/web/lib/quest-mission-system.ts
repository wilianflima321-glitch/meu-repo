// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';
import {
  isCustomObjectiveData,
  ObjectiveState,
  ObjectiveType,
  QuestState,
  type Quest,
  type QuestChain,
  type QuestCustomData,
  type QuestJournalEntry,
  type QuestJSON,
  type QuestMarker,
  type QuestObjective,
  type QuestPrerequisite,
  type QuestReward,
} from './quest-mission-contracts';
import {
  createQuestFromJSON,
  createQuestMarkers,
  deserializeQuestRuntime,
  getLocalizedObjectiveDescription,
  getLocalizedQuestDescription,
  getLocalizedQuestName,
  serializeQuestRuntime,
} from './quest-mission-runtime';
export {
  isCustomObjectiveData,
  ObjectiveState,
  ObjectiveType,
  QuestState,
} from './quest-mission-contracts';
export type {
  Quest,
  QuestChain,
  QuestCustomData,
  QuestJournalEntry,
  QuestJSON,
  QuestMarker,
  QuestObjective,
  QuestObjectiveJSON,
  QuestPrerequisite,
  QuestReward,
} from './quest-mission-contracts';
export class QuestManager {
  private quests: Map<string, Quest> = new Map();
  private chains: Map<string, QuestChain> = new Map();
  private journal: QuestJournalEntry[] = [];
  private markers: Map<string, QuestMarker[]> = new Map();
  private currentLanguage: string = 'en';
  private maxTrackedQuests: number = 5;
  private onQuestStateChange?: (quest: Quest, oldState: QuestState) => void;
  private onObjectiveProgress?: (quest: Quest, objective: QuestObjective) => void;
  private onObjectiveComplete?: (quest: Quest, objective: QuestObjective) => void;
  private onQuestComplete?: (quest: Quest) => void;
  private onQuestFailed?: (quest: Quest) => void;
  private onRewardGranted?: (quest: Quest, reward: QuestReward) => void;
  private prerequisiteChecker?: (prereq: QuestPrerequisite) => boolean;
  private rewardGranter?: (reward: QuestReward) => void;
  constructor() {}
  registerQuest(quest: Quest): void {
    this.quests.set(quest.id, quest);
    this.updateMarkers(quest);
  }
  registerChain(chain: QuestChain): void {
    this.chains.set(chain.id, chain);
  }
  loadFromJSON(json: QuestJSON): Quest {
    const quest = createQuestFromJSON(json);
    this.registerQuest(quest);
    return quest;
  }
  checkAvailability(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;
    if (quest.state === QuestState.TURNED_IN && !quest.repeatable) {
      return false;
    }
    if (quest.repeatable && quest.lastCompletedTime) {
      const cooldownEnd = quest.lastCompletedTime + (quest.repeatCooldown || 0);
      if (Date.now() < cooldownEnd) return false;
    }
    for (const prereq of quest.prerequisites) {
      if (!this.checkPrerequisite(prereq)) return false;
    }
    return true;
  }
  private checkPrerequisite(prereq: QuestPrerequisite): boolean {
    if (this.prerequisiteChecker) {
      return this.prerequisiteChecker(prereq);
    }
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
  startQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;
    if (quest.state !== QuestState.AVAILABLE) {
      if (!this.checkAvailability(questId)) return false;
    }
    const oldState = quest.state;
    quest.state = QuestState.ACTIVE;
    if (quest.timeLimit) {
      quest.startTime = Date.now();
    }
    this.activateInitialObjectives(quest);
    this.addJournalEntry(questId, 'started', `Quest started: ${this.getQuestName(quest)}`);
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
    for (const reward of quest.rewards) {
      this.grantReward(quest, reward);
    }
    if (quest.nextQuestId) {
      this.setQuestState(quest.nextQuestId, QuestState.AVAILABLE);
    }
    this.updateMarkers(quest);
    this.onQuestStateChange?.(quest, oldState);
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
  updateObjective(questId: string, objectiveId: string, progress: number): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    const objective = quest.objectives.get(objectiveId);
    if (!objective || objective.state !== ObjectiveState.ACTIVE) return false;
    objective.currentCount = Math.min(progress, objective.requiredCount);
    this.onObjectiveProgress?.(quest, objective);
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
    if (!objective.optional) {
      this.failQuest(questId, `Failed objective: ${this.getObjectiveDescription(objective)}`);
    }
    return true;
  }
  private checkQuestCompletion(questId: string): void {
    const quest = this.quests.get(questId);
    if (!quest) return;
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
  private forEachActiveObjective(
    type: ObjectiveType,
    callback: (questId: string, objectiveId: string, objective: QuestObjective) => void,
  ): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      for (const [objectiveId, objective] of quest.objectives) {
        if (objective.state === ObjectiveState.ACTIVE && objective.type === type) {
          callback(questId, objectiveId, objective);
        }
      }
    }
  }
  onEnemyKilled(enemyId: string, enemyType: string): void {
    this.forEachActiveObjective(ObjectiveType.KILL, (questId, objectiveId, objective) => {
      if (objective.targetId === enemyId || objective.targetId === enemyType) {
        this.addObjectiveProgress(questId, objectiveId);
      }
    });
  }
  onItemCollected(itemId: string, amount: number = 1): void {
    this.forEachActiveObjective(ObjectiveType.COLLECT, (questId, objectiveId, objective) => {
      if (objective.targetId === itemId) {
        this.addObjectiveProgress(questId, objectiveId, amount);
      }
    });
  }
  onNPCTalked(npcId: string): void {
    this.forEachActiveObjective(ObjectiveType.TALK, (questId, objectiveId, objective) => {
      if (objective.targetId === npcId) {
        this.completeObjective(questId, objectiveId);
      }
    });
  }
  onLocationReached(position: THREE.Vector3): void {
    this.forEachActiveObjective(ObjectiveType.REACH, (questId, objectiveId, objective) => {
      if (objective.targetLocation && position.distanceTo(objective.targetLocation) <= (objective.targetRadius || 5)) {
        this.completeObjective(questId, objectiveId);
      }
    });
  }
  onObjectInteracted(objectId: string): void {
    this.forEachActiveObjective(ObjectiveType.INTERACT, (questId, objectiveId, objective) => {
      if (objective.targetId === objectId) {
        this.completeObjective(questId, objectiveId);
      }
    });
  }
  onCustomEvent(eventName: string, data: QuestCustomData): void {
    this.forEachActiveObjective(ObjectiveType.CUSTOM, (questId, objectiveId, objective) => {
      const customData = isCustomObjectiveData(objective.customData) ? objective.customData : {};
      if (customData.eventName === eventName && (!customData.matcher || customData.matcher(data))) {
        this.addObjectiveProgress(questId, objectiveId);
      }
    });
  }
  update(deltaTime: number): void {
    for (const [questId, quest] of this.quests) {
      if (quest.state !== QuestState.ACTIVE) continue;
      if (quest.timeLimit && quest.startTime) {
        const elapsed = Date.now() - quest.startTime;
        if (elapsed >= quest.timeLimit) {
          this.failQuest(questId, 'Time limit exceeded');
        }
      }
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
  private grantReward(quest: Quest, reward: QuestReward): void {
    if (this.rewardGranter) {
      this.rewardGranter(reward);
    }
    this.onRewardGranted?.(quest, reward);
  }
  private updateMarkers(quest: Quest): void {
    this.markers.set(quest.id, createQuestMarkers(quest));
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
  trackQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== QuestState.ACTIVE) return false;
    const tracked = this.getTrackedQuests();
    if (tracked.length >= this.maxTrackedQuests) {
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
    return getLocalizedQuestName(quest, this.currentLanguage);
  }
  getQuestDescription(quest: Quest): string {
    return getLocalizedQuestDescription(quest, this.currentLanguage);
  }
  getObjectiveDescription(obj: QuestObjective): string {
    return getLocalizedObjectiveDescription(obj, this.currentLanguage);
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
  serialize(): string {
    return serializeQuestRuntime(this.quests, this.journal);
  }
  deserialize(json: string): void {
    this.journal = deserializeQuestRuntime(json, this.quests, (quest) => this.updateMarkers(quest));
  }

}
export const createQuestManager = (): QuestManager => {
  return new QuestManager();
};
export { QuestMarkerRenderer, QuestUIRenderer, createQuestMarkerRenderer, createQuestUI } from './quest-mission-renderers';
