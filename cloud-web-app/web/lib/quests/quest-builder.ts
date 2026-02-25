/** Quest builder DSL. */

import type {
  ObjectiveDefinition,
  ObjectiveType,
  QuestCategory,
  QuestDefinition,
  QuestPriority,
  QuestReward,
} from './quest-system-types';
import type { QuestManager } from './quest-system';

export class QuestBuilder {
  private definition: Partial<QuestDefinition> = {
    objectives: [],
    rewards: [],
  };
  
  static create(id: string): QuestBuilder {
    return new QuestBuilder().id(id);
  }
  
  id(id: string): this {
    this.definition.id = id;
    return this;
  }
  
  name(name: string): this {
    this.definition.name = name;
    return this;
  }
  
  description(desc: string): this {
    this.definition.description = desc;
    return this;
  }
  
  category(cat: QuestCategory): this {
    this.definition.category = cat;
    return this;
  }
  
  priority(priority: QuestPriority): this {
    this.definition.priority = priority;
    return this;
  }
  
  level(level: number): this {
    this.definition.level = level;
    return this;
  }
  
  estimatedTime(time: string): this {
    this.definition.estimatedTime = time;
    return this;
  }
  
  prerequisite(questId: string): this {
    if (!this.definition.prerequisites) {
      this.definition.prerequisites = [];
    }
    this.definition.prerequisites.push(questId);
    return this;
  }
  
  unlocks(questId: string): this {
    if (!this.definition.unlocks) {
      this.definition.unlocks = [];
    }
    this.definition.unlocks.push(questId);
    return this;
  }
  
  repeatable(cooldown?: number): this {
    this.definition.repeatable = true;
    this.definition.cooldown = cooldown;
    return this;
  }
  
  timeLimit(ms: number): this {
    this.definition.timeLimit = ms;
    return this;
  }
  
  autoComplete(): this {
    this.definition.autoComplete = true;
    return this;
  }
  
  // Objectives
  
  objective(obj: ObjectiveDefinition): this {
    this.definition.objectives!.push(obj);
    return this;
  }
  
  killObjective(
    id: string,
    description: string,
    targetId: string,
    count: number,
    optional = false
  ): this {
    return this.objective({
      id,
      type: 'kill',
      description,
      target: targetId,
      requiredAmount: count,
      optional,
    });
  }
  
  collectObjective(
    id: string,
    description: string,
    itemId: string,
    count: number,
    optional = false
  ): this {
    return this.objective({
      id,
      type: 'collect',
      description,
      target: itemId,
      requiredAmount: count,
      optional,
    });
  }
  
  talkObjective(id: string, description: string, npcId: string): this {
    return this.objective({
      id,
      type: 'talk',
      description,
      target: npcId,
      requiredAmount: 1,
    });
  }
  
  reachObjective(
    id: string,
    description: string,
    location: { x: number; y: number; z: number; radius?: number }
  ): this {
    return this.objective({
      id,
      type: 'reach',
      description,
      location,
      requiredAmount: 1,
    });
  }
  
  // Rewards
  
  reward(reward: QuestReward): this {
    this.definition.rewards!.push(reward);
    return this;
  }
  
  xpReward(amount: number): this {
    return this.reward({ type: 'xp', amount });
  }
  
  currencyReward(currencyId: string, amount: number): this {
    return this.reward({ type: 'currency', id: currencyId, amount });
  }
  
  itemReward(itemId: string, amount = 1): this {
    return this.reward({ type: 'item', id: itemId, amount });
  }
  
  reputationReward(factionId: string, amount: number): this {
    return this.reward({ type: 'reputation', id: factionId, amount });
  }
  
  achievementReward(achievementId: string): this {
    return this.reward({ type: 'achievement', id: achievementId });
  }
  
  // Build
  
  build(): QuestDefinition {
    if (!this.definition.id) throw new Error('Quest ID is required');
    if (!this.definition.name) throw new Error('Quest name is required');
    if (!this.definition.description) throw new Error('Quest description is required');
    if (!this.definition.category) throw new Error('Quest category is required');
    if (this.definition.objectives!.length === 0) {
      throw new Error('Quest must have at least one objective');
    }
    
    return this.definition as QuestDefinition;
  }
}
