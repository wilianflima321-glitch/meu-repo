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
      className="relative mb-6 overflow-hidden rounded-[30px] p-4 sm:p-5 border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_14%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] shadow-[0_24px_90px_rgba(2,6,23,0.28),0_0_0_1px_rgba(0,229,255,0.06)] [backdrop-filter:blur(18px)]"
      data-studio-mission-runboard="compact"
    >
      {/* Ambient top-left cyan glow */}
      <div
        className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.22) 0%, transparent 70%)' }}
        aria-hidden
      />
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
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
            className="mt-2 min-h-20 w-full resize-none rounded-2xl px-4 py-3 border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_76%,transparent)] text-sm leading-6 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] outline-none transition-all duration-200 focus:border-[rgba(0,229,255,0.45)] focus:shadow-[0_0_0_3px_rgba(0,229,255,0.10),inset_0_0_20px_rgba(0,229,255,0.04)]"
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
