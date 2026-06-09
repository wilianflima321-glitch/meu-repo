'use client'

import { Pause, Play, RefreshCw, StopCircle, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'

import { AgentCard } from './AgentCard'
import { AgentTrustStrip } from './AgentTrustStrip'
import type {
  AgentFleetMemberSnapshot,
  AgentFleetMemberStatus,
  AgentFleetSnapshot,
  BrowserOperatorRunSummary,
} from './types'

type AgentFleetPanelProps = {
  data: AgentFleetSnapshot
  grouped: Record<AgentFleetMemberStatus, AgentFleetMemberSnapshot[]>
  topMembers: AgentFleetMemberSnapshot[]
  latestReplayRun?: BrowserOperatorRunSummary
  sessionCostCents?: number
  budgetRemainingCents?: number
  onTogglePause: () => void
  onRefresh: () => void
  onStop?: () => void
  onTakeover?: () => void
  focusClass: string
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

function calculateFleetHealth(grouped: Record<AgentFleetMemberStatus, AgentFleetMemberSnapshot[]>): number | null {
  const total = grouped.ready.length + grouped.attention.length + grouped.blocked.length + grouped.paused.length
  if (total === 0) return null

  const weighted =
    grouped.ready.length +
    grouped.paused.length * 0.7 +
    grouped.attention.length * 0.45 -
    grouped.blocked.length * 0.15

  return clamp(weighted / total)
}

function CostMeter({
  sessionCostCents,
  budgetRemainingCents,
}: {
  sessionCostCents?: number
  budgetRemainingCents?: number
}) {
  if (sessionCostCents === undefined && budgetRemainingCents === undefined) return null

  const sessionUSD = ((sessionCostCents ?? 0) / 100).toFixed(2)
  const hasBudget = budgetRemainingCents !== undefined
  const budgetUSD = hasBudget ? (budgetRemainingCents / 100).toFixed(2) : null
  const totalBudget = (sessionCostCents ?? 0) + (budgetRemainingCents ?? 0)
  const usedFraction = hasBudget && totalBudget > 0 ? Math.min((sessionCostCents ?? 0) / totalBudget, 1) : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            Session cost
          </span>
          <span className="font-mono text-[12px] font-semibold text-[var(--aethel-text-primary)]">
            ${sessionUSD}
          </span>
        </div>
        {usedFraction !== null && (
          <div className="h-1 overflow-hidden rounded-full bg-[var(--aethel-surface-secondary)]">
            <div
              className="h-full rounded-full bg-[var(--aethel-info-light)] transition-all duration-500"
              style={{ width: `${Math.round(usedFraction * 100)}%` }}
              role="progressbar"
              aria-valuenow={Math.round(usedFraction * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Budget used"
            />
          </div>
        )}
      </div>
      {budgetUSD ? (
        <div className="shrink-0 text-right">
          <span className="text-[10px] text-[var(--aethel-text-quaternary)]">${budgetUSD} left</span>
        </div>
      ) : null}
    </div>
  )
}

function FleetHealthBar({ score }: { score: number | null }) {
  if (score === null) return null

  const pct = Math.round(score * 100)
  const tone = pct >= 80
    ? 'bg-[var(--aethel-success-light)]'
    : pct >= 50
      ? 'bg-[var(--aethel-warning-light)]'
      : 'bg-[var(--aethel-error-light)]'
  const label = pct >= 80 ? 'High' : pct >= 50 ? 'Watch' : 'Risk'

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            Fleet health
          </span>
          <span className="text-[11px] font-semibold text-[var(--aethel-text-primary)]">
            {label} - {pct}%
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[var(--aethel-surface-secondary)]">
          <div
            className={cn('h-full rounded-full transition-all duration-500', tone)}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Fleet health derived from current agent statuses"
          />
        </div>
      </div>
    </div>
  )
}

function FleetMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold', tone)}>{value}</p>
    </div>
  )
}

export function AgentFleetPanel({
  data,
  grouped,
  topMembers,
  latestReplayRun,
  sessionCostCents,
  budgetRemainingCents,
  onTogglePause,
  onRefresh,
  onStop,
  onTakeover,
  focusClass,
}: AgentFleetPanelProps) {
  const isRunning = !data.paused && topMembers.some((member) => member.status === 'ready' || member.status === 'attention')
  const hasCostReceipt = sessionCostCents !== undefined || budgetRemainingCents !== undefined
  const fleetHealth = calculateFleetHealth(grouped)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
      <header className="flex flex-col gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-quaternary)]">
              Mission
            </p>
            <h3 className="mt-0.5 truncate text-[13px] font-semibold text-[var(--aethel-text-primary)]">
              {data.centralAgent}
            </h3>
            <p className="mt-0.5 text-[11px] leading-[1.5] text-[var(--aethel-text-secondary)]">
              {data.summary}
            </p>
          </div>

          {isRunning && (onTakeover || onStop) ? (
            <div className="flex shrink-0 flex-col gap-1.5">
              {onTakeover ? (
                <button
                  type="button"
                  onClick={onTakeover}
                  title="Pause agents and review changes before continuing"
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_38%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-primary-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]',
                    focusClass,
                  )}
                >
                  <UserCog className="h-3 w-3" aria-hidden="true" />
                  Takeover
                </button>
              ) : null}
              {onStop ? (
                <button
                  type="button"
                  onClick={onStop}
                  title="Stop all agents immediately. Applied changes are not reversed."
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-error-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)]',
                    focusClass,
                  )}
                >
                  <StopCircle className="h-3 w-3" aria-hidden="true" />
                  Stop
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePause}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-subtle)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]',
              focusClass,
            )}
            aria-pressed={data.paused}
          >
            {data.paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {data.paused ? 'Resume fleet' : 'Pause fleet'}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-subtle)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]',
              focusClass,
            )}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
          <span className="ml-auto rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-quaternary)]">
            {data.mode}
          </span>
        </div>
      </header>

      <div className={cn('grid gap-2', hasCostReceipt ? 'grid-cols-2' : 'grid-cols-1')}>
        {hasCostReceipt ? <CostMeter sessionCostCents={sessionCostCents} budgetRemainingCents={budgetRemainingCents} /> : null}
        <FleetHealthBar score={fleetHealth} />
      </div>

      <div className="grid grid-cols-4 gap-2">
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)]">
            Blocked before apply
          </p>
          <ul className="mt-2 space-y-1 text-[11px] leading-[1.5] text-[var(--aethel-text-secondary)]">
            {data.blockers.slice(0, 4).map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-2 xl:grid-cols-2">
        {topMembers.map((member) => (
          <AgentCard key={`${member.agent}:${member.lane}`} member={member} />
        ))}
      </div>
    </div>
  )
}