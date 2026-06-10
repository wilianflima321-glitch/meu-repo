import type { QuestInstance, QuestPriority } from './types';

export function selectHighestPriorityQuest(
  activeQuestIds: Set<string>,
  instances: Map<string, QuestInstance>
): string | null {
  let bestQuest: string | null = null;
  let bestPriority = -1;

  const priorityOrder: Record<QuestPriority, number> = {
    critical: 3,
    high: 2,
    normal: 1,
    low: 0,
  };

  for (const questId of activeQuestIds) {
    const instance = instances.get(questId);
    if (!instance) continue;

    const priority = priorityOrder[instance.definition.priority || 'normal'];
    if (priority > bestPriority) {
      bestPriority = priority;
      bestQuest = questId;
    }
  }

  return bestQuest;
}
