'use client'

import { StudioGameScopeEvidencePanel } from './StudioGameScopeEvidencePanel'
import { StudioRunboardActions } from './StudioRunboardActions'
import { StudioRunboardControls } from './StudioRunboardControls'
import { StudioRunboardHeader } from './StudioRunboardHeader'
import { StudioRuntimeTruthPanel } from './StudioRuntimeTruthPanel'
import type { StudioMissionControlViewProps } from './StudioMissionControlView.types'

export function StudioMissionControlView({
  mission,
  setMission,
  mode,
  setMode,
  gameScope,
  setGameScope,
  gameGenre,
  setGameGenre,
  runtimeTarget,
  setRuntimeTarget,
  runtimeModes,
  selectedRuntimeMode,
  gameScopePlan,
  session,
  wave,
  busy,
  notice,
  canRunWave,
  runtimeReady,
  studioStats,
  startSession,
  runWave,
  stopSession,
}: StudioMissionControlViewProps) {
  const selectClass =
    'min-h-10 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)]'
  const quietPanelClass =
    'rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)]'

  return (
    <section
      className="mb-6 rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] p-4 shadow-[0_24px_90px_rgba(2,6,23,0.22)] sm:p-5"
      data-studio-mission-runboard="compact"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <StudioRunboardHeader session={session} runtimeReady={runtimeReady} selectedRuntimeMode={selectedRuntimeMode} />

          <label htmlFor="studio-mission" className="mt-4 block text-sm font-semibold text-[var(--aethel-text-primary)]">
            What should the Studio coordinate?
          </label>
          <textarea
            id="studio-mission"
            suppressHydrationWarning
            value={mission}
            onChange={(event) => setMission(event.target.value)}
            className="mt-2 min-h-20 w-full resize-none rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_76%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-primary)_55%,transparent)] focus:ring-2 focus:ring-[var(--aethel-focus-ring)]"
          />

          <StudioRunboardControls
            selectClass={selectClass}
            mode={mode}
            setMode={setMode}
            gameScope={gameScope}
            setGameScope={setGameScope}
            gameGenre={gameGenre}
            setGameGenre={setGameGenre}
            runtimeTarget={runtimeTarget}
            setRuntimeTarget={setRuntimeTarget}
            runtimeModes={runtimeModes}
          />

          {gameScopePlan ? <StudioGameScopeEvidencePanel gameScopePlan={gameScopePlan} quietPanelClass={quietPanelClass} /> : null}

          <StudioRuntimeTruthPanel selectedRuntimeMode={selectedRuntimeMode} quietPanelClass={quietPanelClass} />
        </div>

        <StudioRunboardActions
          quietPanelClass={quietPanelClass}
          studioStats={studioStats}
          busy={busy}
          session={session}
          canRunWave={canRunWave}
          mission={mission}
          notice={notice}
          wave={wave}
          startSession={startSession}
          runWave={runWave}
          stopSession={stopSession}
        />
      </div>
    </section>
  )
}
