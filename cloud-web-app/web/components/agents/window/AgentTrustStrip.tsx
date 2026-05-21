'use client'

import type { BrowserOperatorRunSummary } from './types'

type AgentTrustStripProps = {
  activeLockCount: number
  staleSurfaceCount: number
  latestReplayRun?: BrowserOperatorRunSummary
}

export function AgentTrustStrip({ activeLockCount, staleSurfaceCount, latestReplayRun }: AgentTrustStripProps) {
  const items = [
    {
      label: 'Cost',
      value: 'Unavailable',
      detail: 'CostMeter remains the source of truth until per-agent cost is returned here.',
      tone: 'text-[var(--aethel-warning-light)]',
    },
    {
      label: 'Read receipts',
      value: staleSurfaceCount === 0 ? 'Fresh' : `${staleSurfaceCount} stale`,
      detail: staleSurfaceCount === 0 ? 'No stale surfaces reported by the fleet snapshot.' : 'Review stale surfaces before applying writes.',
      tone: staleSurfaceCount === 0 ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-warning-light)]',
    },
    {
      label: 'Scope locks',
      value: `${activeLockCount}`,
      detail: 'Active locks reduce parallel edit collisions.',
      tone: activeLockCount > 0 ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-tertiary)]',
    },
    {
      label: 'Latest replay',
      value: latestReplayRun ? latestReplayRun.status : 'No replay yet',
      detail: latestReplayRun ? `${latestReplayRun.stepCount} steps - ${latestReplayRun.timelineHash.slice(0, 8)}` : 'Browser Operator evidence will appear after the first governed run.',
      tone: latestReplayRun ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-text-tertiary)]',
    },
  ]

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{item.label}</p>
          <p className={`mt-1 text-sm font-semibold ${item.tone}`}>{item.value}</p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-quaternary)]">{item.detail}</p>
        </div>
      ))}
    </div>
  )
}