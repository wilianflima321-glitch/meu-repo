import type { QuestInstance } from './types';

export function findExpiredQuestIds(
  instances: Map<string, QuestInstance>,
  now = Date.now()
): string[] {
  const expired: string[] = [];

  for (const [questId, instance] of instances) {
    if (instance.state === 'active' && instance.expiresAt && now >= instance.expiresAt) {
      expired.push(questId);
    }
  }

  return expired;
}
