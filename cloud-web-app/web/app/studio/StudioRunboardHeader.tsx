'use client';

import { Cpu, FlaskConical, Layers, Zap } from 'lucide-react';
import type { StudioMissionControlViewProps } from './StudioMissionControlView.types';
import { statusClass } from './StudioMissionControl.options';

export function StudioRunboardHeader({
  session,
  runtimeReady,
  selectedRuntimeMode,
}: Pick<StudioMissionControlViewProps, 'session' | 'runtimeReady' | 'selectedRuntimeMode'>) {
  const isActive = session?.status === 'active';

  return (
    <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
      {/* Ambient glow layer */}
      <div
        className="pointer-events-none absolute -top-12 -left-8 h-48 w-96 rounded-full opacity-30"
        style={{
          background: isActive
            ? 'radial-gradient(circle, rgba(34,211,238,.18) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(129,140,248,.12) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex-1 min-w-0">
        {/* Badge row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-primary)]/30 bg-[var(--aethel-primary)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
            <Layers className="h-3 w-3" aria-hidden />
            Studio Runboard
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusClass(session?.status)}`}
          >
            {session?.status ?? 'No session'}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
              runtimeReady ? statusClass('active') : statusClass('stopped')
            }`}
          >
            <Cpu className="h-3 w-3" aria-hidden />
            {selectedRuntimeMode.label}: {selectedRuntimeMode.badge}
          </span>

          {isActive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300 animate-glow-cyan">
              <Zap className="h-3 w-3" aria-hidden />
              Live
            </span>
          )}
        </div>

        {/* Headline */}
        <h2 className="mt-4 bg-gradient-to-r from-[var(--aethel-text-primary)] via-[var(--aethel-neon-indigo)] to-[var(--aethel-text-primary)] bg-clip-text text-transparent text-2xl font-semibold tracking-tight">
          Plan the next Studio move.
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--aethel-text-tertiary)]">
          One mission, one verified next action. Production detail stays under review.
        </p>
      </div>

      {/* Runtime pill */}
      <div
        className="
          relative z-10 flex flex-col items-end gap-1
          rounded-xl border border-[var(--aethel-glass-border)]
          bg-[var(--aethel-glass-bg)] px-4 py-3
          backdrop-blur-[var(--aethel-glass-blur)]
          text-right
        "
      >
        <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--aethel-text-quaternary)]">
          Runtime
        </span>
        <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">
          {selectedRuntimeMode.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest ${
            runtimeReady ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {runtimeReady ? (
            <>
              <span className="aethel-beacon h-1.5 w-1.5 text-emerald-400">
                <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Available
            </>
          ) : (
            <>
              <FlaskConical className="h-3 w-3" />
              Experimental
            </>
          )}
        </span>
      </div>
    </div>
  );
}
