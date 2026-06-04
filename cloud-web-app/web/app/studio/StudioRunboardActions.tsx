import Link from 'next/link'
import { StudioLocalRuntimeCapsule } from '@/components/studio/StudioLocalRuntimeCapsule'
import type { StudioMissionControlViewProps } from './StudioMissionControlView.types'

type StudioRunboardActionsProps = Pick<
  StudioMissionControlViewProps,
  'studioStats' | 'busy' | 'session' | 'canRunWave' | 'mission' | 'notice' | 'wave' | 'startSession' | 'runWave' | 'stopSession'
> & {
  quietPanelClass: string
}

export function StudioRunboardActions({
  quietPanelClass,
  studioStats,
  busy,
  session,
  canRunWave,
  mission,
  notice,
  wave,
  startSession,
  runWave,
  stopSession,
}: StudioRunboardActionsProps) {
  return (
    <div className={`${quietPanelClass} p-4`}>
      <div className="grid grid-cols-3 gap-2 text-center">
        {studioStats.map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--aethel-border-subtle)] p-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{item.label}</p>
            <p className="mt-1 truncate text-xs font-semibold text-[var(--aethel-text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={startSession}
          disabled={busy !== null || !mission.trim()}
          className="min-h-11 rounded-xl bg-[var(--aethel-text-primary)] px-4 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:bg-[var(--aethel-text-secondary)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busy === 'resume' ? 'Resuming...' : busy === 'start' ? 'Starting...' : session ? 'Restart session' : 'Start session'}
        </button>
        <button
          type="button"
          onClick={runWave}
          disabled={!canRunWave || busy !== null}
          className="min-h-11 rounded-xl border border-[var(--aethel-border-primary)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busy === 'wave' ? 'Planning wave...' : 'Validate plan'}
        </button>
        <Link
          href="/evidence"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)]"
        >
          Review receipts
        </Link>
        <button
          type="button"
          onClick={stopSession}
          disabled={!canRunWave || busy !== null}
          className="min-h-10 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-4 text-xs font-semibold text-[var(--aethel-warning-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busy === 'stop' ? 'Pausing...' : 'Pause session'}
        </button>
      </div>

      <StudioLocalRuntimeCapsule />

      {notice ? (
        <p className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
          {notice}
        </p>
      ) : null}
      {wave?.tasks && wave.tasks.length > 0 ? (
        <details className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] px-3 py-2">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
            Planned tasks ({Math.min(wave.tasks.length, 3)})
          </summary>
          <div className="mt-2 space-y-1">
            {wave.tasks.slice(0, 3).map((task) => (
              <p key={task.id} className="truncate text-[11px] text-[var(--aethel-text-tertiary)]">
                {task.goal}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}
