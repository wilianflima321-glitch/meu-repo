'use client'

import { useMemo, useState } from 'react'
import { Bot, History, Radio, Sparkles, UserRound } from 'lucide-react'
import type { AIChatTimelineItem } from './timeline-types'

interface AIChatTimelineProps {
  activeThreadTitle?: string | null
  hasHistory: boolean
  items: AIChatTimelineItem[]
  onOpenHistory?: () => void
}

const TONE_STYLES = {
  user: {
    icon: UserRound,
    className:
      'border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]',
  },
  assistant: {
    icon: Bot,
    className:
      'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]',
  },
  system: {
    icon: Sparkles,
    className:
      'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]',
  },
  live: {
    icon: Radio,
    className:
      'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]',
  },
} as const

export function AIChatTimeline({ activeThreadTitle, hasHistory, items, onOpenHistory }: AIChatTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleItems = useMemo(() => items.slice(0, isExpanded ? 3 : 1), [isExpanded, items])
  const hiddenCount = Math.max(items.length - visibleItems.length, 0)
  const canExpand = items.length > 1
  if (items.length === 0 && !activeThreadTitle) return null

  return (
    <section className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)] px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Operational timeline
          </span>
          <div className="min-w-0 truncate text-[11px] text-[var(--aethel-text-tertiary)]">
            {activeThreadTitle ? `Focused thread: ${activeThreadTitle}` : 'Resume the right flow without restating the whole context.'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canExpand ? (
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              {isExpanded ? 'Hide details' : 'View details'}
            </button>
          ) : null}

          {hasHistory && onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              <History className="h-3.5 w-3.5" />
              Open history
            </button>
          )}
        </div>
      </div>

      {visibleItems.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {visibleItems.map((item) => {
            const tone = TONE_STYLES[item.tone]
            const Icon = tone.icon
            return (
              <article
                key={item.id}
                className={`rounded-2xl border px-3 py-1.5 ${tone.className}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-current/20 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_10%,transparent)]">
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-medium">{item.title}</div>
                      <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{item.meta}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] leading-[1.15rem] text-[var(--aethel-text-secondary)]">
                      {item.summary}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
          {hiddenCount > 0 ? (
            <div className="px-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
              +{hiddenCount} additional events in full history
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
