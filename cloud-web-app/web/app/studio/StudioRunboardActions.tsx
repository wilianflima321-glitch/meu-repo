'use client';

import Link from 'next/link';
import { Loader2, Play, Pause, GitMerge, Receipt, ChevronRight } from 'lucide-react';
import { StudioLocalRuntimeCapsule } from '@/components/studio/StudioLocalRuntimeCapsule';
import type { StudioMissionControlViewProps } from './StudioMissionControlView.types';

type StudioRunboardActionsProps = Pick<
  StudioMissionControlViewProps,
  'studioStats' | 'busy' | 'session' | 'canRunWave' | 'mission' | 'notice' | 'wave' | 'startSession' | 'runWave' | 'stopSession'
> & {
  quietPanelClass: string;
};

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
  const isBusy = busy !== null;

  return (
    <div className={`${quietPanelClass} p-4 space-y-4`}>
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {studioStats.map((item) => (
          <div
            key={item.label}
            className="
              flex flex-col items-center justify-center rounded-xl
              border border-[var(--aethel-glass-border)]
              bg-[var(--aethel-surface-primary)]
              px-2 py-2.5 text-center
              transition-all hover:border-[var(--aethel-border-primary)]
              hover:bg-[var(--aethel-surface-secondary)]
            "
          >
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
              {item.label}
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold text-[var(--aethel-text-primary)] max-w-full">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Primary CTAs */}
      <div className="flex flex-col gap-2">
        {/* Start / Restart */}
        <button
          type="button"
          id="studio-start-session-btn"
          onClick={startSession}
          disabled={isBusy || !mission.trim()}
          className="
            relative flex min-h-[44px] items-center justify-center gap-2
            rounded-xl px-4 text-sm font-semibold
            bg-gradient-to-r from-cyan-500 to-[var(--aethel-primary)]
            text-white border border-cyan-400/30
            hover:from-cyan-400 hover:to-[var(--aethel-primary-light)]
            hover:shadow-[var(--aethel-glow-cyan)]
            transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {busy === 'resume' || busy === 'start' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {busy === 'resume' ? 'Resuming…' : busy === 'start' ? 'Starting…' : session ? 'Restart session' : 'Start session'}
        </button>

        {/* Validate plan */}
        <button
          type="button"
          id="studio-run-wave-btn"
          onClick={runWave}
          disabled={!canRunWave || isBusy}
          className="
            flex min-h-[44px] items-center justify-center gap-2
            rounded-xl border border-[var(--aethel-border-primary)]
            px-4 text-sm font-semibold text-[var(--aethel-text-secondary)]
            hover:border-[var(--aethel-primary)]/35 hover:bg-[var(--aethel-primary)]/8 hover:text-[var(--aethel-primary-light)]
            transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {busy === 'wave' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
          {busy === 'wave' ? 'Planning wave…' : 'Validate plan'}
        </button>

        {/* Review receipts */}
        <Link
          href="/evidence"
          className="
            inline-flex min-h-[44px] items-center justify-center gap-2
            rounded-xl border border-[var(--aethel-border-primary)]
            px-4 text-sm font-semibold text-[var(--aethel-text-secondary)]
            hover:border-emerald-500/30 hover:bg-emerald-500/8 hover:text-emerald-300
            transition-all duration-200
          "
        >
          <Receipt className="h-4 w-4" />
          Review receipts
        </Link>

        {/* Pause */}
        <button
          type="button"
          id="studio-stop-session-btn"
          onClick={stopSession}
          disabled={!canRunWave || isBusy}
          className="
            flex min-h-[40px] items-center justify-center gap-2
            rounded-xl border border-amber-500/25 bg-amber-500/6
            px-4 text-xs font-semibold text-amber-400
            hover:border-amber-500/40 hover:bg-amber-500/12
            transition-all duration-200
            disabled:opacity-30 disabled:cursor-not-allowed
          "
        >
          {busy === 'stop' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
          {busy === 'stop' ? 'Pausing…' : 'Pause session'}
        </button>
      </div>

      <StudioLocalRuntimeCapsule />

      {/* Notice toast */}
      {notice && (
        <p
          role="status"
          className="
            flex items-start gap-2 rounded-xl border border-[var(--aethel-border-subtle)]
            bg-[var(--aethel-surface-primary)] px-3 py-2.5
            text-xs text-[var(--aethel-text-secondary)]
            animate-slide-right
          "
        >
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-[var(--aethel-neon-cyan)]" />
          {notice}
        </p>
      )}

      {/* Planned tasks */}
      {wave?.tasks && wave.tasks.length > 0 && (
        <details className="rounded-xl border border-[var(--aethel-glass-border)] overflow-hidden">
          <summary className="
            flex cursor-pointer list-none items-center justify-between
            px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]
            text-[var(--aethel-text-tertiary)]
            hover:bg-[var(--aethel-surface-tertiary)] transition-colors
          ">
            <span>Planned tasks</span>
            <span className="rounded-full bg-[var(--aethel-primary)]/15 border border-[var(--aethel-primary)]/25 px-1.5 py-0.5 text-[var(--aethel-primary-light)]">
              {wave.tasks.length}
            </span>
          </summary>
          <div className="border-t border-[var(--aethel-glass-border)] divide-y divide-[var(--aethel-glass-border)]">
            {wave.tasks.slice(0, 5).map((task) => (
              <p
                key={task.id}
                className="px-3 py-2 truncate text-[11px] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
              >
                {task.goal}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
