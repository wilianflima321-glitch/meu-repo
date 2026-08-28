'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'

export interface ArcadeReview {
  id: string
  author: string
  hoursPlayed: number
  recommended: boolean
  publishedAt: string
  content: string
  helpfulCount: number
  verifiedPurchase: boolean
}

interface ArcadeReviewsPanelProps {
  reviews: ArcadeReview[]
}

export function ArcadeReviewsPanel({ reviews }: ArcadeReviewsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all')
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({})

  const filtered = reviews.filter((r) => {
    if (filter === 'positive') return r.recommended
    if (filter === 'negative') return !r.recommended
    return true
  })

  const positiveCount = reviews.filter((r) => r.recommended).length
  const positivePercentage = reviews.length ? Math.round((positiveCount / reviews.length) * 100) : 100

  const toggleHelpful = (id: string) => {
    setHelpfulVotes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-6">
      {/* Header with overall sentiment score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--aethel-border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[var(--aethel-primary)]" />
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">
              Customer Reviews
            </h3>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-lg font-bold ${positivePercentage >= 70 ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-warning)]'}`}>
              {positivePercentage >= 80 ? 'Very Positive' : positivePercentage >= 60 ? 'Positive' : 'Mixed'}
            </span>
            <span className="text-xs font-mono text-[var(--aethel-text-tertiary)]">
              ({positivePercentage}% of {reviews.length} reviews are positive)
            </span>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-1">
          {(['all', 'positive', 'negative'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${filter === mode
                ? 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] shadow-sm'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      <div className="mt-6 space-y-4">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--aethel-text-quaternary)]">
            No reviews match this filter.
          </p>
        ) : (
          filtered.map((rev) => {
            const hasVoted = helpfulVotes[rev.id]
            const currentHelpful = rev.helpfulCount + (hasVoted ? 1 : 0)
            return (
              <div
                key={rev.id}
                className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-4 transition hover:border-[var(--aethel-border-secondary)]"
              >
                {/* Author & Sentiment header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${rev.recommended
                      ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)]'
                      : 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error-light)]'
                    }`}>
                      {rev.recommended ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--aethel-text-primary)]">
                          {rev.author}
                        </span>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--aethel-neon-cyan)]" title="Verified Player / License">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--aethel-text-tertiary)]">
                        <Clock className="h-3 w-3" />
                        <span>{rev.hoursPlayed.toFixed(1)} hrs on record</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[var(--aethel-text-quaternary)]">
                    {rev.publishedAt}
                  </span>
                </div>

                {/* Content */}
                <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">
                  {rev.content}
                </p>

                {/* Helpful footer */}
                <div className="mt-3 flex items-center justify-between border-t border-[var(--aethel-border-subtle)] pt-2.5 text-[11px] text-[var(--aethel-text-tertiary)]">
                  <span>Was this review helpful?</span>
                  <button
                    type="button"
                    onClick={() => toggleHelpful(rev.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition ${hasVoted
                      ? 'border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                      : 'border-[var(--aethel-border-subtle)] hover:border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)]'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>Yes ({currentHelpful})</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
