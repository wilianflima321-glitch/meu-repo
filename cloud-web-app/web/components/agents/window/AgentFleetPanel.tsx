'use client'

import { Pause, Play, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'

import { AgentCard } from './AgentCard'
import { AgentTrustStrip } from './AgentTrustStrip'
import type { AgentFleetMemberSnapshot, AgentFleetMemberStatus, AgentFleetSnapshot, BrowserOperatorRunSummary } from './types'

type AgentFleetPanelProps = {
  data: AgentFleetSnapshot
  grouped: Record<AgentFleetMemberStatus, AgentFleetMemberSnapshot[]>
  topMembers: AgentFleetMemberSnapshot[]
  latestReplayRun?: BrowserOperatorRunSummary
  onTogglePause: () => void
  onRefresh: () => void
  focusClass: string
}

export function AgentFleetPanel({
  data,
  grouped,
  topMembers,
  latestReplayRun,
  onTogglePause,
  onRefresh,
  focusClass,
}: AgentFleetPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Agent workforce</p>
          <h3 className="mt-1 text-base font-semibold text-[var(--aethel-text-primary)]">{data.centralAgent}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--aethel-text-secondary)]">{data.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--aethel-border-primary)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
            {data.mode}
          </span>
          <button
            type="button"
            onClick={onTogglePause}
            className={cn('inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
            aria-pressed={data.paused}
          >
            {data.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {data.paused ? 'Resume fleet' : 'Pause fleet'}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className={cn('inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FleetMetric label="Ready" value={grouped.ready.length} tone="text-[var(--aethel-success-light)]" />
        <FleetMetric label="Attention" value={grouped.attention.length} tone="text-[var(--aethel-warning-light)]" />
        <FleetMetric label="Locks" value={data.activeLockCount} tone="text-[var(--aethel-info-light)]" />
        <FleetMetric label="Stale" value={data.staleSurfaceCount} tone="text-[var(--aethel-error-light)]" />
      </div>

      <AgentTrustStrip
        activeLockCount={data.activeLockCount}
        staleSurfaceCount={data.staleSurfaceCount}
        latestReplayRun={latestReplayRun}
      />

      {data.blockers.length > 0 ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] p-3">
          <p className="text-xs font-semibold text-[var(--aethel-warning-light)]">Blocked before apply</p>
          <ul className="mt-2 space-y-1 text-xs text-[var(--aethel-text-secondary)]">
            {data.blockers.slice(0, 4).map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {topMembers.map((member) => (
          <AgentCard key={`${member.agent}:${member.lane}`} member={member} />
        ))}
      </div>
    </div>
  )
}

function FleetMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}