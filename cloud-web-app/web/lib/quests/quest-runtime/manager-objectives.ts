import type { ObjectiveDefinition, ObjectiveType, QuestInstance } from './types';

export interface ObjectiveUpdate {
  amount: number;
  objectiveId: string;
  questId: string;
}

export function findObjectiveUpdatesByTarget(
  instances: Map<string, QuestInstance>,
  targetId: string,
  types: ObjectiveType[],
  amount = 1
): ObjectiveUpdate[] {
  const updates: ObjectiveUpdate[] = [];

  for (const [questId, instance] of instances) {
    if (instance.state !== 'active') continue;

    for (const objective of instance.definition.objectives) {
      if (types.includes(objective.type) && objective.target === targetId) {
        updates.push({ amount, objectiveId: objective.id, questId });
      }
    }
  }

  return updates;
}

export function findLocationObjectiveUpdates(
  instances: Map<string, QuestInstance>,
  position: { x: number; y: number; z: number }
): ObjectiveUpdate[] {
  const updates: ObjectiveUpdate[] = [];

  for (const [questId, instance] of instances) {
    if (instance.state !== 'active') continue;

    for (const objective of instance.definition.objectives) {
      if (objective.type === 'reach' && isInsideObjectiveLocation(position, objective)) {
        updates.push({ amount: 1, objectiveId: objective.id, questId });
      }
    }
  }

  return updates;
}

function isInsideObjectiveLocation(
  position: { x: number; y: number; z: number },
  objective: ObjectiveDefinition
): boolean {
  if (!objective.location) return false;

  const distance = Math.sqrt(
    Math.pow(position.x - objective.location.x, 2) +
    Math.pow(position.y - objective.location.y, 2) +
    Math.pow(position.z - objective.location.z, 2)
  );

  return distance <= (objective.location.radius || 5);
}
