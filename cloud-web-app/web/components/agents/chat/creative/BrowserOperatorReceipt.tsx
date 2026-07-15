'use client'

/**
 * AI-v1-f / J.8 — BrowserOperator receipt strip for Nexus / Agents UI.
 */

import {
  BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS,
  BROWSER_OPERATOR_HONESTY,
} from '@/lib/production/browser-operator'

interface BrowserOperatorReceiptProps {
  sessionId?: string | null
  runId?: string | null
  sourceCount?: number
  timelineHash?: string | null
  blockedReason?: string | null
  className?: string
}

export function BrowserOperatorReceipt({
  sessionId,
  runId,
  sourceCount,
  timelineHash,
  blockedReason,
  className,
}: BrowserOperatorReceiptProps) {
  if (!sessionId && !runId && !blockedReason) return null

  const tone = blockedReason
    ? 'border-[var(--aethel-error)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]'
    : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]'

  return (
    <div
      className={className ?? `mx-4 mb-2 rounded-lg border px-3 py-2 ${tone}`}
      role="status"
      data-aethel-j8="browser-operator-receipt"
      data-cdp-farm={BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-info-light)]">
          BrowserOperator {blockedReason ? 'blocked' : 'evidence'}
        </div>
        <span
          className="rounded border border-[var(--aethel-warning)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-warning-light)]"
          title={BROWSER_OPERATOR_HONESTY.cdpFarmHeld}
        >
          CDP [{BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS}]
        </span>
      </div>
      {blockedReason ? (
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">{blockedReason}</p>
      ) : (
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">
          Governed fetch/snapshot · {sourceCount ?? 0} source(s) · allowlist sandbox
        </p>
      )}
      {(sessionId || runId || timelineHash) && (
        <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          {sessionId ? `session:${sessionId}` : null}
          {sessionId && runId ? ' · ' : null}
          {runId ? `run:${runId}` : null}
          {(sessionId || runId) && timelineHash ? ' · ' : null}
          {timelineHash ? `tl:${timelineHash.slice(0, 12)}` : null}
        </p>
      )}
    </div>
  )
}
