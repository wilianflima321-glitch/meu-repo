'use client'

/**
 * I.4 — Report / Block empty-honest surface.
 * Never renders fake friends. Party/presence lives in PartyPresencePanel when unlocked.
 */

import { useCallback, useEffect, useState } from 'react'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('SocialModerationPanel')

const REPORT_REASONS = [
  'harassment',
  'hate',
  'sexual_content',
  'spam',
  'impersonation',
  'other',
] as const

type BlockRow = {
  id: string
  blockedId: string
  reason?: string
  createdAt: string
}

type ReportRow = {
  id: string
  targetUserId: string
  reason: string
  details: string
  status: string
  createdAt: string
}

type SocialModerationPanelProps = {
  /** Optional Arcade slug context for reports */
  gameId?: string
}

export function SocialModerationPanel({ gameId }: SocialModerationPanelProps) {
  const [blocks, setBlocks] = useState<BlockRow[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [authHint, setAuthHint] = useState(false)
  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>('harassment')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [blockRes, reportRes] = await Promise.all([
        fetch('/api/hub/social/block', { cache: 'no-store' }),
        fetch('/api/hub/social/report', { cache: 'no-store' }),
      ])
      if (blockRes.status === 401 || reportRes.status === 401) {
        setAuthHint(true)
        setBlocks([])
        setReports([])
        setLoadError(null)
        return
      }
      setAuthHint(false)
      if (!blockRes.ok || !reportRes.ok) {
        const errBody = await blockRes.json().catch(() => ({}))
        throw new Error(
          (errBody as { error?: string }).error ||
            `social moderation ${blockRes.status}/${reportRes.status}`,
        )
      }
      const blockData = (await blockRes.json()) as { blocks?: BlockRow[] }
      const reportData = (await reportRes.json()) as { reports?: ReportRow[] }
      setBlocks(Array.isArray(blockData.blocks) ? blockData.blocks : [])
      setReports(Array.isArray(reportData.reports) ? reportData.reports : [])
      setLoadError(null)
    } catch (err) {
      log.warn('social_moderation_panel_load_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      setLoadError(err instanceof Error ? err.message : String(err))
      setBlocks([])
      setReports([])
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onBlock = async () => {
    const blockedId = targetId.trim()
    if (!blockedId) {
      setStatusMsg('Enter a user id to block')
      return
    }
    setBusy(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/hub/social/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setAuthHint(true)
        setStatusMsg('Sign in to block')
        return
      }
      if (!res.ok) {
        setStatusMsg((data as { error?: string }).error || 'Block failed')
        return
      }
      setStatusMsg('Blocked')
      setTargetId('')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const onReport = async () => {
    const targetUserId = targetId.trim()
    if (!targetUserId) {
      setStatusMsg('Enter a user id to report')
      return
    }
    setBusy(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/hub/social/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          reason,
          details,
          gameId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setAuthHint(true)
        setStatusMsg('Sign in to report')
        return
      }
      if (!res.ok) {
        setStatusMsg((data as { error?: string }).error || 'Report failed')
        return
      }
      setStatusMsg('Report submitted')
      setDetails('')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
        Report / Block · COPPA-ready
      </p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
        Durable safety actions. Party presence unlocks separately when invite substrate is ready — no
        fake online friends.
      </p>

      {authHint ? (
        <p className="mt-3 text-xs text-[var(--aethel-warning-light)]">
          Sign in to list or submit Report / Block.
        </p>
      ) : null}
      {loadError ? (
        <p className="mt-3 text-xs text-[var(--aethel-warning-light)]">{loadError}</p>
      ) : null}
      {statusMsg ? (
        <p className="mt-2 text-xs text-[var(--aethel-text-secondary)]">{statusMsg}</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
          User id
          <input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-2 text-xs text-[var(--aethel-text-primary)]"
            placeholder="target user id"
            autoComplete="off"
          />
        </label>
        <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
          Report reason
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as (typeof REPORT_REASONS)[number])}
            className="mt-1 block w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-2 text-xs text-[var(--aethel-text-primary)]"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
        Details (optional)
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-2 text-xs text-[var(--aethel-text-primary)]"
          placeholder="What happened?"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onReport()}
          className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-secondary)] disabled:opacity-50"
        >
          Report
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onBlock()}
          className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-warning-light)] disabled:opacity-50"
        >
          Block
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Your blocks
          </p>
          {blocks.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">No blocks yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {blocks.map((b) => (
                <li key={b.id} className="text-xs text-[var(--aethel-text-secondary)]">
                  {b.blockedId}
                  {b.reason ? ` · ${b.reason}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Your reports
          </p>
          {reports.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">No reports yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {reports.map((r) => (
                <li key={r.id} className="text-xs text-[var(--aethel-text-secondary)]">
                  {r.targetUserId} · {r.reason} · {r.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default SocialModerationPanel
