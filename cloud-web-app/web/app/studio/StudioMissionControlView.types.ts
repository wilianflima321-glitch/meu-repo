import type { GameScopePlan, PlayableGameGenre, PlayableGameScope } from '@/lib/production/game-scope-orchestrator'
import type { RuntimeModeViewModel } from '@aethel/runtime/runtime-mode-view-model'
import type { RuntimeTarget, StudioMode, StudioSessionRecord, TaskWaveResponse } from './StudioMissionControl.types'

export type StudioBusyState = 'resume' | 'start' | 'wave' | 'stop' | null

export type StudioMissionControlViewProps = {
  mission: string
  setMission: (value: string) => void
  mode: StudioMode
  setMode: (value: StudioMode) => void
  gameScope: PlayableGameScope
  setGameScope: (value: PlayableGameScope) => void
  gameGenre: PlayableGameGenre
  setGameGenre: (value: PlayableGameGenre) => void
  runtimeTarget: RuntimeTarget
  setRuntimeTarget: (value: RuntimeTarget) => void
  runtimeModes: RuntimeModeViewModel[]
  selectedRuntimeMode: RuntimeModeViewModel
  gameScopePlan: GameScopePlan | null
  session: StudioSessionRecord | null
  wave: TaskWaveResponse | null
  busy: StudioBusyState
  notice: string | null
  canRunWave: boolean
  runtimeReady: boolean
  studioStats: Array<{ label: string; value: string }>
  startSession: () => Promise<void>
  runWave: () => Promise<void>
  stopSession: () => Promise<void>
}
