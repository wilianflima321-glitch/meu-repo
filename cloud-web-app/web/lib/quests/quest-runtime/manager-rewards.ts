import type { QuestReward } from './types';

export function grantQuestRewards(
  rewards: QuestReward[],
  emitReward: (reward: QuestReward) => void
): QuestReward[] {
  const granted: QuestReward[] = [];

  for (const reward of rewards) {
    emitReward(reward);
    granted.push(reward);
  }

  return granted;
}
