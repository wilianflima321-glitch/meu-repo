// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three'

import {
  ObjectiveState,
  QuestState,
  type Quest,
  type QuestJournalEntry,
  type QuestJSON,
  type QuestMarker,
  type QuestObjective,
} from './quest-mission-contracts'

export function createQuestFromJSON(json: QuestJSON): Quest {
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
  }

  for (const objData of json.objectives || []) {
    const objective: QuestObjective = {
      ...objData,
      currentCount: 0,
      state: ObjectiveState.INACTIVE,
      targetLocation: objData.targetLocation
        ? new THREE.Vector3(objData.targetLocation.x, objData.targetLocation.y, objData.targetLocation.z)
        : undefined,
    }
    quest.objectives.set(objective.id, objective)
  }

  return quest
}

export function createQuestMarkers(quest: Quest): QuestMarker[] {
  const markers: QuestMarker[] = []
  if (quest.state === QuestState.AVAILABLE && quest.questGiverId) {
    markers.push({
      questId: quest.id,
      position: new THREE.Vector3(),
      type: 'quest_giver',
      icon: '!',
      color: quest.markerColor || '#ffcc00',
    })
  }
  if (quest.state === QuestState.ACTIVE) {
    for (const [objId, obj] of quest.objectives) {
      if (obj.state !== ObjectiveState.ACTIVE || obj.hidden || !obj.targetLocation) continue
      markers.push({
        questId: quest.id,
        objectiveId: objId,
        position: obj.targetLocation,
        type: 'objective',
        icon: '◆',
        color: quest.markerColor || '#ffcc00',
      })
    }
  }
  if (quest.state === QuestState.COMPLETED && quest.turnInId) {
    markers.push({
      questId: quest.id,
      position: new THREE.Vector3(),
      type: 'turn_in',
      icon: '?',
      color: '#00ff00',
    })
  }
  return markers
}

export function getLocalizedQuestName(quest: Quest, language: string): string {
  return quest.localizedName?.[language] ?? quest.name
}

export function getLocalizedQuestDescription(quest: Quest, language: string): string {
  return quest.localizedDescription?.[language] ?? quest.description
}

export function getLocalizedObjectiveDescription(obj: QuestObjective, language: string): string {
  return obj.localizedDescription?.[language] ?? obj.description
}

export function serializeQuestRuntime(quests: Map<string, Quest>, journal: QuestJournalEntry[]): string {
  return JSON.stringify({
    quests: Array.from(quests.entries()).map(([id, quest]) => ({
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
    journal,
  })
}

export function deserializeQuestRuntime(
  json: string,
  quests: Map<string, Quest>,
  updateQuestMarkers: (quest: Quest) => void,
): QuestJournalEntry[] {
  const data = JSON.parse(json) as {
    quests: Array<{
      id: string
      state: QuestState
      isTracked: boolean
      startTime?: number
      lastCompletedTime?: number
      objectives: Array<{ id: string; currentCount: number; state: ObjectiveState }>
    }>
    journal: QuestJournalEntry[]
  }

  for (const questData of data.quests) {
    const quest = quests.get(questData.id)
    if (!quest) continue
    quest.state = questData.state
    quest.isTracked = questData.isTracked
    quest.startTime = questData.startTime
    quest.lastCompletedTime = questData.lastCompletedTime
    for (const objData of questData.objectives) {
      const obj = quest.objectives.get(objData.id)
      if (!obj) continue
      obj.currentCount = objData.currentCount
      obj.state = objData.state
    }
    updateQuestMarkers(quest)
  }
  return data.journal
}
