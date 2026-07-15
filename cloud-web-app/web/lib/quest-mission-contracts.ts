import type * as THREE from 'three'

export type QuestCustomData = unknown

export enum QuestState {
  UNKNOWN = 'unknown',
  AVAILABLE = 'available',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TURNED_IN = 'turned_in',
}

export enum ObjectiveState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ObjectiveType {
  COLLECT = 'collect',
  KILL = 'kill',
  TALK = 'talk',
  REACH = 'reach',
  INTERACT = 'interact',
  ESCORT = 'escort',
  DEFEND = 'defend',
  TIMER = 'timer',
  CUSTOM = 'custom',
}

export interface QuestObjective {
  id: string
  type: ObjectiveType
  description: string
  localizedDescription?: Record<string, string>
  targetId?: string
  targetLocation?: THREE.Vector3
  targetRadius?: number
  currentCount: number
  requiredCount: number
  state: ObjectiveState
  optional: boolean
  hidden: boolean
  order?: number
  prerequisites?: string[]
  customData?: QuestCustomData
}

export interface QuestReward {
  type: 'experience' | 'currency' | 'item' | 'reputation' | 'skill' | 'unlock' | 'custom'
  id?: string
  amount?: number
  data?: QuestCustomData
}

export interface QuestPrerequisite {
  type: 'quest_completed' | 'level' | 'reputation' | 'item' | 'flag' | 'custom'
  target: string
  value?: QuestCustomData
}

export interface Quest {
  id: string
  name: string
  localizedName?: Record<string, string>
  description: string
  localizedDescription?: Record<string, string>
  category: string
  state: QuestState
  questGiverId?: string
  turnInId?: string
  objectives: Map<string, QuestObjective>
  rewards: QuestReward[]
  prerequisites: QuestPrerequisite[]
  requiredLevel?: number
  repeatable: boolean
  repeatCooldown?: number
  lastCompletedTime?: number
  timeLimit?: number
  startTime?: number
  chainId?: string
  chainOrder?: number
  nextQuestId?: string
  icon?: string
  markerColor?: string
  priority: number
  isTracked: boolean
}

export interface QuestChain {
  id: string
  name: string
  quests: string[]
  currentQuestIndex: number
}

export interface QuestMarker {
  questId: string
  objectiveId?: string
  position: THREE.Vector3
  type: 'quest_giver' | 'objective' | 'turn_in'
  icon: string
  color: string
}

export interface QuestJournalEntry {
  questId: string
  timestamp: number
  entry: string
  type: 'started' | 'objective' | 'completed' | 'failed' | 'note'
}

export type QuestObjectiveJSON = Omit<QuestObjective, 'targetLocation'> & {
  targetLocation?: { x: number; y: number; z: number }
}

export type QuestJSON = Omit<Quest, 'objectives' | 'state' | 'isTracked'> & {
  objectives?: QuestObjectiveJSON[]
  state?: QuestState
  isTracked?: boolean
}

export function isCustomObjectiveData(value: QuestCustomData): value is {
  eventName?: string
  matcher?: (data: QuestCustomData) => boolean
} {
  return typeof value === 'object' && value !== null
}
