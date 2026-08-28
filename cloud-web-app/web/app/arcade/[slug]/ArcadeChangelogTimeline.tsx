'use client'

import { GitCommit, Sparkles, Wrench, Zap } from 'lucide-react'

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  highlights: {
    type: 'feature' | 'performance' | 'fix'
    text: string
  }[]
}

interface ArcadeChangelogTimelineProps {
  entries: ChangelogEntry[]
}

export function ArcadeChangelogTimeline({ entries }: ArcadeChangelogTimelineProps) {
  if (!entries.length) return null

  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitCommit className="h-4 w-4 text-[var(--aethel-primary)]" />
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">
          Update History & Patch Notes
        </h3>
      </div>

      <div className="relative border-l border-[var(--aethel-border-subtle)] ml-3 space-y-6">
        {entries.map((entry, index) => (
          <div key={entry.version} className="relative pl-6">
            {/* Timeline node dot */}
            <div className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-[var(--aethel-surface-primary)] ${index === 0 ? 'bg-[var(--aethel-primary)] ring-4 ring-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)]' : 'bg-[var(--aethel-text-quaternary)]'}`} />

            {/* Header info */}
            <div className="flex flex-wrap items-baseline gap-2 mb-1.5">
              <span className="rounded-md border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--aethel-primary-light)]">
                {entry.version}
              </span>
              <h4 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                {entry.title}
              </h4>
              <span className="text-xs font-mono text-[var(--aethel-text-quaternary)]">
                {entry.date}
              </span>
            </div>

            {/* Highlights list */}
            <ul className="space-y-1.5 text-xs text-[var(--aethel-text-secondary)]">
              {entry.highlights.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  {item.type === 'feature' && (
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--aethel-neon-cyan)] mt-0.5" />
                  )}
                  {item.type === 'performance' && (
                    <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--aethel-warning)] mt-0.5" />
                  )}
                  {item.type === 'fix' && (
                    <Wrench className="h-3.5 w-3.5 shrink-0 text-[var(--aethel-text-tertiary)] mt-0.5" />
                  )}
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
