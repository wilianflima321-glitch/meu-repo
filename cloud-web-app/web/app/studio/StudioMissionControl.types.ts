import type { RuntimeModeTarget } from '@/lib/runtime/runtime-mode-view-model'
import type { PlayableGameGenre, PlayableGameScope } from '@/lib/production/game-scope-orchestrator'

export type StudioSessionStatus = 'active' | 'stopped'

export type StudioSessionRecord = {
  id: string
  title: string
  mission: string
  mode: string
  status: StudioSessionStatus
  runtimeTarget: string
  activeTaskIds: string[]
  evidenceRefs: string[]
  stopReason?: string
}

export type TaskWaveResponse = {
  taskCount?: number
  tasks?: Array<{ id: string; goal: string }>
  error?: string
  message?: string
}

export type StudioMode = 'mission' | 'app' | 'game' | 'film' | 'audio' | 'research' | 'release'
export type RuntimeTarget = RuntimeModeTarget
export type { PlayableGameGenre, PlayableGameScope }
