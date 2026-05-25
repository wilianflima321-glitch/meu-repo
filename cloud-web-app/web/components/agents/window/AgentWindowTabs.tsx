'use client'

import { cn } from '@/lib/utils'

type AgentWindowTabsProps = {
  activeView: 'fleet' | 'navigation' | 'replay'
  setActiveView: (view: 'fleet' | 'navigation' | 'replay') => void
  focusClass: string
}

const views = [
  { id: 'fleet' as const, label: 'Fleet', hint: 'Locks and scope' },
  { id: 'navigation' as const, label: 'Navigation', hint: 'Browser lanes' },
  { id: 'replay' as const, label: 'Replay', hint: 'Browser evidence' },
]

export function AgentWindowTabs({ activeView, setActiveView, focusClass }: AgentWindowTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_84%,transparent)] px-3 py-2" role="tablist" aria-label="Agent operation views">
      {views.map((view) => {
        const active = activeView === view.id
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveView(view.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-left',
              focusClass,
              active
                ? 'bg-[var(--aethel-surface-elevated)] text-[var(--aethel-text-primary)] shadow-[var(--aethel-shadow-soft)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]',
            )}
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em]">{view.label}</span>
            <span className="block text-[10px] normal-case tracking-normal text-[var(--aethel-text-muted)]">{view.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
