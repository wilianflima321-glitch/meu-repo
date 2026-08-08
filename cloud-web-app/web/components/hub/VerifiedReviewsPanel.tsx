'use client'

/**
 * I.2 — Verified reviews star surface + helpful votes + early-access honesty.
 * Empty-honest when none; POST gated on F.2 playtime (server-enforced).
 * No fake 5-star walls / no invented helpful counts.
 */

import { useCallback, useEffect, useState } from 'react'
import { Star, Check } from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('VerifiedReviewsPanel')

type ReviewRow = {
  id: string
  userId: string
  rating: number
  body: string
  verifiedPlaytimeSeconds: number
  isEarlyAccess?: boolean
  helpfulCount?: number
  helpfulWeight?: number
  viewerHasVoted?: boolean
  createdAt: string
}

type ViewerEligibility = {
  authenticated?: boolean
  playtimeSeconds?: number
  requiredSeconds?: number
  earlyAccessOptIn?: boolean
  eligible?: boolean
  code?: string
  reason?: string
}

type ReviewsPayload = {
  reviews?: ReviewRow[]
  count?: number
  averageRating?: number | null
  requiredPlaytimeSeconds?: number
  earlyAccessOptIn?: boolean
  viewerEligibility?: ViewerEligibility
}

type VerifiedReviewsPanelProps = {
  gameId: string
}

function Stars({
  value,
  onChange,
  interactive,
}: {
  value: number
  onChange?: (n: number) => void
  interactive?: boolean
}) {
  return (
    <div
      className="flex items-center gap-1"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`${value} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value
        if (!interactive) {
          return (
            <span
              key={n}
              className={
                filled
                  ? 'text-[var(--aethel-warning-light)]'
                  : 'text-[var(--aethel-text-quaternary)]'
              }
              aria-hidden
            >
              <Star size={14} fill={filled ? 'currentColor' : 'none'} />
            </span>
          )
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => onChange?.(n)}
            className={`leading-none transition ${CANONICAL_FOCUS} ${
              filled
                ? 'text-[var(--aethel-warning-light)]'
                : 'text-[var(--aethel-text-quaternary)]'
            }`}
          >
            <Star size={18} fill={filled ? 'currentColor' : 'none'} />
          </button>
        )
      })}
    </div>
  )
}

export function VerifiedReviewsPanel({ gameId }: VerifiedReviewsPanelProps) {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [count, setCount] = useState(0)
  const [average, setAverage] = useState<number | null>(null)
  const [requiredSeconds, setRequiredSeconds] = useState(7200)
  const [earlyAccessOptIn, setEarlyAccessOptIn] = useState(false)
  const [viewerPlaytimeSeconds, setViewerPlaytimeSeconds] = useState(0)
  const [viewerEligible, setViewerEligible] = useState(false)
  const [viewerAuthenticated, setViewerAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hub/games/${encodeURIComponent(gameId)}/reviews`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`reviews ${res.status}`)
      const data = (await res.json()) as ReviewsPayload
      setReviews(Array.isArray(data.reviews) ? data.reviews : [])
      setCount(typeof data.count === 'number' ? data.count : 0)
      setAverage(typeof data.averageRating === 'number' ? data.averageRating : null)
      if (typeof data.requiredPlaytimeSeconds === 'number') {
        setRequiredSeconds(data.requiredPlaytimeSeconds)
      }
      setEarlyAccessOptIn(data.earlyAccessOptIn === true)
      const elig = data.viewerEligibility
      setViewerAuthenticated(elig?.authenticated === true)
      setViewerEligible(elig?.eligible === true)
      setViewerPlaytimeSeconds(
        typeof elig?.playtimeSeconds === 'number' ? elig.playtimeSeconds : 0,
      )
      if (typeof elig?.requiredSeconds === 'number') {
        setRequiredSeconds(elig.requiredSeconds)
      }
      if (typeof elig?.earlyAccessOptIn === 'boolean') {
        setEarlyAccessOptIn(elig.earlyAccessOptIn)
      }
    } catch (err) {
      log.warn('reviews_load_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      setReviews([])
      setCount(0)
      setAverage(null)
      setViewerEligible(false)
      setViewerAuthenticated(false)
      setViewerPlaytimeSeconds(0)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const submit = async () => {
    setError(null)
    setMessage(null)
    if (!viewerAuthenticated) {
      setError('Sign in to post a verified review.')
      return
    }
    if (!viewerEligible) {
      const need = requiredSeconds
      const have = viewerPlaytimeSeconds
      setError(
        earlyAccessOptIn && need < 7200
          ? `Need ${need}s verified playtime for Early Access reviews (have ${have}s).`
          : `Need ${need}s verified playtime (have ${have}s). No review until the 2h gate.`,
      )
      return
    }
    if (rating < 1 || rating > 5) {
      setError('Pick a star rating (1–5).')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/hub/games/${encodeURIComponent(gameId)}/reviews`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ rating, body }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        reason?: string
        requiredPlaytimeSeconds?: number
        playtimeSeconds?: number
      }
      if (!res.ok) {
        if (res.status === 401 || data.error === 'AUTH_REQUIRED') {
          setError('Sign in to post a verified review.')
          setViewerAuthenticated(false)
          setViewerEligible(false)
        } else if (data.error === 'PLAYTIME_GATE') {
          const have = data.playtimeSeconds ?? viewerPlaytimeSeconds
          const need = data.requiredPlaytimeSeconds ?? requiredSeconds
          setViewerPlaytimeSeconds(have)
          setViewerEligible(false)
          const gateLabel =
            earlyAccessOptIn && need < 7200
              ? `Need ${need}s verified playtime for Early Access reviews (have ${have}s).`
              : `Need ${need}s verified playtime (have ${have}s). No review until the 2h gate.`
          setError(gateLabel)
        } else {
          setError(data.reason || data.error || 'Review rejected.')
        }
        return
      }
      setMessage('Verified review saved.')
      setBody('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleHelpful = async (review: ReviewRow) => {
    setError(null)
    setVotingId(review.id)
    try {
      const url = `/api/hub/games/${encodeURIComponent(gameId)}/reviews/${encodeURIComponent(review.id)}/helpful`
      const res = await fetch(url, {
        method: review.viewerHasVoted ? 'DELETE' : 'POST',
        headers: { Accept: 'application/json' },
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        reason?: string
      }
      if (!res.ok) {
        if (res.status === 401) setError('Sign in to mark a review helpful.')
        else setError(data.reason || data.error || 'Helpful vote rejected.')
        return
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Helpful vote failed.')
    } finally {
      setVotingId(null)
    }
  }

  const gateHours = Math.round((requiredSeconds / 3600) * 10) / 10
  const gateCopy =
    earlyAccessOptIn && requiredSeconds < 7200
      ? `Early Access opt-in · ${Math.floor(requiredSeconds / 60)}m verified gate · helpful votes ranked`
      : `${gateHours}h F.2 playtime gate · helpful votes ranked · no fake ratings`

  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
            Verified reviews
          </p>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{gateCopy}</p>
        </div>
        {!loading && count > 0 && average !== null ? (
          <div className="text-right">
            <Stars value={Math.round(average)} />
            <p className="mt-0.5 text-[11px] text-[var(--aethel-text-tertiary)]">
              {average.toFixed(1)} · {count} review{count === 1 ? '' : 's'}
            </p>
          </div>
        ) : null}
      </div>

      {earlyAccessOptIn ? (
        <p className="mt-3 rounded-md border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)]">
          Creator opted into Early Access reviews — badge shows when playtime is under 2h.
        </p>
      ) : null}

      {loading ? (
        <div className="mt-4 h-16 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)]" />
      ) : null}

      {!loading && count === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--aethel-border-subtle)] px-3 py-4 text-center text-xs text-[var(--aethel-text-tertiary)]">
          No verified reviews yet — empty by design, not a 5-star wall.
        </p>
      ) : null}

      {!loading && reviews.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_40%,transparent)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars value={r.rating} />
                <div className="flex flex-wrap items-center gap-2">
                  {r.isEarlyAccess ? (
                    <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)]">
                      Early Access — &lt;2h verified
                    </span>
                  ) : null}
                  <span className="text-[10px] text-[var(--aethel-text-quaternary)]">
                    {Math.floor(r.verifiedPlaytimeSeconds / 60)}m verified
                  </span>
                </div>
              </div>
              {r.body ? (
                <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-secondary)]">
                  {r.body}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={votingId === r.id}
                  onClick={() => void toggleHelpful(r)}
                  className={`inline-flex items-center rounded-md border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition hover:brightness-110 disabled:opacity-50 ${CANONICAL_FOCUS} ${
                    r.viewerHasVoted
                      ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
                      : 'text-[var(--aethel-text-tertiary)]'
                  }`}
                >
                  {votingId === r.id ? (
                    '…'
                  ) : r.viewerHasVoted ? (
                    <span className="inline-flex items-center gap-1">
                      Helpful <Check size={12} />
                    </span>
                  ) : (
                    'Helpful'
                  )}
                </button>
                <span className="text-[10px] text-[var(--aethel-text-quaternary)]">
                  {r.helpfulCount ?? 0} vote{(r.helpfulCount ?? 0) === 1 ? '' : 's'} · weight{' '}
                  {r.helpfulWeight ?? 0}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 border-t border-[var(--aethel-border-subtle)] pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
          Write a verified review
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--aethel-text-tertiary)]">
          {!viewerAuthenticated
            ? 'Sign in required — anonymous Arcade playtime stays local until auth.'
            : viewerEligible
              ? `Eligible · ${Math.floor(viewerPlaytimeSeconds / 60)}m authenticated F.2 playtime`
              : `Have ${Math.floor(viewerPlaytimeSeconds / 60)}m / need ${Math.floor(requiredSeconds / 60)}m authenticated F.2 playtime`}
        </p>
        <div className="mt-2">
          <Stars
            value={rating}
            onChange={viewerEligible ? setRating : undefined}
            interactive={viewerEligible}
          />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          disabled={!viewerEligible}
          placeholder={
            earlyAccessOptIn && requiredSeconds < 7200
              ? `Optional thoughts — after ${Math.floor(requiredSeconds / 60)}m verified (Early Access)`
              : 'Optional thoughts — only after 2h verified playtime'
          }
          className="mt-3 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)] disabled:opacity-50"
        />
        <button
          type="button"
          disabled={submitting || !viewerEligible}
          onClick={() => void submit()}
          className={`mt-3 inline-flex items-center rounded-lg bg-[var(--aethel-primary)] px-4 py-2 text-xs font-semibold text-[var(--aethel-text-inverse)] transition hover:brightness-110 disabled:opacity-50 ${CANONICAL_FOCUS}`}
        >
          {submitting ? 'Saving…' : 'Submit verified review'}
        </button>
        {error ? (
          <p className="mt-2 text-xs text-[var(--aethel-warning-light)]" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-2 text-xs text-[var(--aethel-success-light)]" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default VerifiedReviewsPanel
