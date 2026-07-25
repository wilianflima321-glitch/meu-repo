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
  const selectClass = 'min-h-10 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)]'
  const quietPanelClass = 'rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)]'

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-[30px] border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_14%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] p-4 shadow-[var(--aethel-shadow-xl)] [backdrop-filter:blur(18px)] sm:p-5"
      data-studio-mission-runboard="compact"
    >
      {/* Ambient top-left cyan glow */}
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--aethel-neon-cyan)_22%,transparent)_0%,transparent_70%)] opacity-20"
        aria-hidden
      />
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(color-mix(in_srgb,var(--aethel-neon-cyan)_50%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--aethel-neon-cyan)_50%,transparent)_1px,transparent_1px)] [background-size:32px_32px]"
        aria-hidden
      />
      <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
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
            className="mt-2 min-h-20 w-full resize-none rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_76%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] outline-none transition-all duration-200 focus:border-[color-mix(in_srgb,var(--aethel-neon-cyan)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)]"
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
