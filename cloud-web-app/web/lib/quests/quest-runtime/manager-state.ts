import type {
  ObjectiveProgress,
  QuestCategory,
  QuestDefinition,
  QuestInstance,
  QuestJournalEntry,
  QuestPriority,
  QuestState,
} from './types';

export interface SavedQuestInstance {
  completedAt: number | null;
  expiresAt: number | null;
  failedAt: number | null;
  id: string;
  progress: Array<[string, ObjectiveProgress]>;
  repeatCount: number;
  startedAt: number | null;
  state: QuestState;
  tracked: boolean;
}

export interface SavedQuestManagerState {
  completedQuests: string[];
  instances: SavedQuestInstance[];
  trackedQuestId: string | null;
}

export function createQuestInstance(definition: QuestDefinition): QuestInstance {
  return {
    definition,
    state: definition.prerequisites?.length ? 'locked' : 'available',
    objectiveProgress: createObjectiveProgress(definition),
    startedAt: null,
    completedAt: null,
    failedAt: null,
    expiresAt: null,
    tracked: false,
    repeatCount: 0,
  };
}

export function createObjectiveProgress(definition: QuestDefinition): Map<string, ObjectiveProgress> {
  return new Map(
    definition.objectives.map((objective) => [
      objective.id,
      { currentAmount: 0, completed: false },
    ])
  );
}

export function resetQuestInstance(instance: QuestInstance, state: QuestState = 'available'): void {
  instance.state = state;
  instance.startedAt = null;
  instance.completedAt = null;
  instance.failedAt = null;
  instance.expiresAt = null;
  instance.objectiveProgress = createObjectiveProgress(instance.definition);
}

export function requiredObjectivesComplete(instance: QuestInstance): boolean {
  for (const [objectiveId, progress] of instance.objectiveProgress) {
    const objective = instance.definition.objectives.find((item) => item.id === objectiveId);
    if (objective && !objective.optional && !progress.completed) return false;
  }
  return true;
}

export function sortQuestJournalEntries(entries: QuestJournalEntry[]): QuestJournalEntry[] {
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

  return entries.sort((a, b) => {
    const priorityA = priorityOrder[a.quest.priority || 'normal'];
    const priorityB = priorityOrder[b.quest.priority || 'normal'];
    if (priorityA !== priorityB) return priorityB - priorityA;

    return categoryOrder[b.quest.category] - categoryOrder[a.quest.category];
  });
}

export function serializeQuestManagerState(params: {
  completedQuests: Set<string>;
  instances: Map<string, QuestInstance>;
  trackedQuestId: string | null;
}): string {
  const data: SavedQuestManagerState = {
    completedQuests: Array.from(params.completedQuests),
    instances: Array.from(params.instances.entries()).map(([id, instance]) => ({
      id,
      state: instance.state,
      progress: Array.from(instance.objectiveProgress.entries()),
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      failedAt: instance.failedAt,
      expiresAt: instance.expiresAt,
      tracked: instance.tracked,
      repeatCount: instance.repeatCount,
    })),
    trackedQuestId: params.trackedQuestId,
  };

  return JSON.stringify(data);
}

export function applyQuestManagerState(
  json: string,
  instances: Map<string, QuestInstance>
): {
  activeQuestIds: Set<string>;
  completedQuests: Set<string>;
  trackedQuestId: string | null;
} {
  const data = JSON.parse(json) as SavedQuestManagerState;
  const activeQuestIds = new Set<string>();

  for (const saved of data.instances) {
    const instance = instances.get(saved.id);
    if (!instance) continue;

    instance.state = saved.state;
    instance.startedAt = saved.startedAt;
    instance.completedAt = saved.completedAt;
    instance.failedAt = saved.failedAt;
    instance.expiresAt = saved.expiresAt;
    instance.tracked = saved.tracked;
    instance.repeatCount = saved.repeatCount;

    for (const [objectiveId, progress] of saved.progress) {
      instance.objectiveProgress.set(objectiveId, progress);
    }

    if (instance.state === 'active') activeQuestIds.add(saved.id);
  }

  return {
    activeQuestIds,
    completedQuests: new Set(data.completedQuests),
    trackedQuestId: data.trackedQuestId,
  };
}
