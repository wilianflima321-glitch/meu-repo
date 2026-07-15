import type { PlayableGameGenre, PlayableGameScope } from '@/lib/production/game-scope-orchestrator'
import type { RuntimeTarget, StudioMode } from './StudioMissionControl.types'
import type { StudioMissionControlViewProps } from './StudioMissionControlView.types'
import { GAME_GENRE_OPTIONS, GAME_SCOPE_OPTIONS, MODE_OPTIONS } from './StudioMissionControl.options'

type StudioRunboardControlsProps = Pick<
  StudioMissionControlViewProps,
  'mode' | 'setMode' | 'gameScope' | 'setGameScope' | 'gameGenre' | 'setGameGenre' | 'runtimeTarget' | 'setRuntimeTarget' | 'runtimeModes'
> & {
  selectClass: string
}

export function StudioRunboardControls({
  selectClass,
  mode,
  setMode,
  gameScope,
  setGameScope,
  gameGenre,
  setGameGenre,
  runtimeTarget,
  setRuntimeTarget,
  runtimeModes,
}: StudioRunboardControlsProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Studio mode picker">
      <select value={mode} onChange={(event) => setMode(event.target.value as StudioMode)} className={selectClass} aria-label="Studio mode">
        {MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {mode === 'game' ? (
        <>
          <select value={gameScope} onChange={(event) => setGameScope(event.target.value as PlayableGameScope)} className={selectClass} aria-label="Game scope">
            {GAME_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select value={gameGenre} onChange={(event) => setGameGenre(event.target.value as PlayableGameGenre)} className={selectClass} aria-label="Game genre">
            {GAME_GENRE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <select value={runtimeTarget} onChange={(event) => setRuntimeTarget(event.target.value as RuntimeTarget)} className={selectClass} aria-label="Runtime target">
        {runtimeModes.map((option) => (
          <option key={option.id} value={option.runtimeTarget} disabled={!option.selectable}>
            {option.label} - {option.badge}
          </option>
        ))}
      </select>
    </div>
  )
}
