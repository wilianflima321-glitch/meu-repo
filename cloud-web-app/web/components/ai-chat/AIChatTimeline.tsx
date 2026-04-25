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
    <section className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Linha do tempo recente
          </div>
          {activeThreadTitle ? (
            <div className="mt-1 text-xs text-[var(--aethel-text-secondary)]">Thread ativa: {activeThreadTitle}</div>
          ) : (
            <div className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">Continue do ponto certo sem recontar tudo.</div>
          )}
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
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const tone = TONE_STYLES[item.tone]
            const Icon = tone.icon
            return (
              <article
                key={item.id}
                className={`min-w-[220px] max-w-[280px] rounded-2xl border px-3 py-2 ${tone.className}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <Icon className="h-3.5 w-3.5" />
                    {item.title}
                  </div>
                  <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{item.meta}</span>
                </div>
                <div className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{item.summary}</div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
