'use client'

import { Bot, History, Radio, Sparkles, UserRound } from 'lucide-react'
import type { AIChatTimelineItem } from './useAIChatHistoryMode'

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
  if (items.length === 0 && !activeThreadTitle) return null

  return (
    <section className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)] px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Timeline operacional
          </span>
          <div className="min-w-0 truncate text-[11px] text-[var(--aethel-text-tertiary)]">
            {activeThreadTitle ? `Thread em foco: ${activeThreadTitle}` : 'Retome o fluxo certo sem recontar o contexto inteiro.'}
          </div>
        </div>

        {hasHistory && onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            <History className="h-3.5 w-3.5" />
            Abrir historico
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const tone = TONE_STYLES[item.tone]
            const Icon = tone.icon
            return (
              <article
                key={item.id}
                className={`min-w-[190px] max-w-[240px] rounded-2xl border px-3 py-2 ${tone.className}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <Icon className="h-3.5 w-3.5" />
                    {item.title}
                  </div>
                  <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{item.meta}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--aethel-text-secondary)]">{item.summary}</div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
