import type { QuestInstance, QuestJournalEntry } from './types';
import { sortQuestJournalEntries } from './manager-state';

export function buildQuestJournal(instances: Iterable<QuestInstance>, now = Date.now()): QuestJournalEntry[] {
  const entries: QuestJournalEntry[] = [];

  for (const instance of instances) {
    if (instance.state !== 'active' && instance.state !== 'completed') continue;

    const objectives = instance.definition.objectives
      .filter((objective) => !objective.hidden)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((objective) => ({
        definition: objective,
        progress: instance.objectiveProgress.get(objective.id)!,
      }));

    entries.push({
      quest: instance.definition,
      state: instance.state,
      objectives,
      tracked: instance.tracked,
      timeRemaining: instance.expiresAt ? Math.max(0, instance.expiresAt - now) : undefined,
    });
  }

  return sortQuestJournalEntries(entries);
}
