import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { QuestNodeData } from './QuestEditor'

export const initialQuestNodes: Node<QuestNodeData>[] = [
  {
    id: 'q1',
    type: 'quest',
    position: { x: 100, y: 50 },
    data: {
      questId: 'main_001',
      title: 'The Lost Artifact',
      description: 'An ancient artifact has been discovered in the ruins. Retrieve it before the enemy forces do.',
      state: 'available',
      category: 'main',
      level: 5,
      isMainQuest: true,
      objectives: [
        { id: 'o1', type: 'explore', description: 'Find the Ancient Ruins', targetCount: 1, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
        { id: 'o2', type: 'collect', description: 'Retrieve the Artifact', targetId: 'artifact_001', targetCount: 1, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
        { id: 'o3', type: 'kill', description: 'Defeat the Guardian', targetId: 'guardian_boss', targetCount: 1, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
      ],
      rewards: [
        { id: 'r1', type: 'xp', amount: 500, description: '500 XP' },
        { id: 'r2', type: 'gold', amount: 100, description: '100 Gold' },
      ],
      prerequisites: [],
      giver: 'Elder Mage',
      location: 'Ancient Ruins',
    },
  },
  {
    id: 'q2',
    type: 'quest',
    position: { x: 100, y: 350 },
    data: {
      questId: 'main_002',
      title: 'Deciphering the Past',
      description: 'The artifact contains mysterious inscriptions. Find someone who can translate them.',
      state: 'unavailable',
      category: 'main',
      level: 7,
      isMainQuest: true,
      objectives: [
        { id: 'o1', type: 'talk', description: 'Speak to the Scholar', targetId: 'npc_scholar', targetCount: 1, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
        { id: 'o2', type: 'collect', description: 'Gather Research Materials', targetId: 'research_mat', targetCount: 5, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
      ],
      rewards: [
        { id: 'r1', type: 'xp', amount: 750, description: '750 XP' },
        { id: 'r2', type: 'item', itemId: 'translation_book', amount: 1, description: 'Ancient Translation Guide' },
      ],
      prerequisites: [{ type: 'quest', questId: 'main_001' }],
      giver: 'Elder Mage',
    },
  },
  {
    id: 'q3',
    type: 'quest',
    position: { x: 450, y: 150 },
    data: {
      questId: 'side_001',
      title: "Merchant's Request",
      description: 'The local merchant needs help dealing with bandits on the trade route.',
      state: 'available',
      category: 'side',
      level: 4,
      isMainQuest: false,
      objectives: [
        { id: 'o1', type: 'kill', description: 'Clear Bandits from Trade Route', targetId: 'bandit', targetCount: 10, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
      ],
      rewards: [
        { id: 'r1', type: 'xp', amount: 200, description: '200 XP' },
        { id: 'r2', type: 'gold', amount: 50, description: '50 Gold' },
        { id: 'r3', type: 'reputation', amount: 10, description: '+10 Merchant Guild Rep' },
      ],
      prerequisites: [],
      giver: 'Traveling Merchant',
    },
  },
]

export const initialQuestEdges: Edge[] = [
  {
    id: 'e1',
    source: 'q1',
    target: 'q2',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#eab308', strokeWidth: 2 },
    label: 'requires',
    labelStyle: { fill: '#eab308', fontSize: 10 },
    labelBgStyle: { fill: '#1e293b' },
  },
]
