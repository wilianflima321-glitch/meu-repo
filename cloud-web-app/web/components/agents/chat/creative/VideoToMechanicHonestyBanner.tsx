'use client'

/**
 * AI-v1-e / J.6 — Honest VideoToMechanic UX (scaffold ≠ playable AAA).
 */

import { VIDEO_TO_MECHANIC_HONESTY } from '@/lib/production/video-to-mechanic-operator'

interface VideoToMechanicHonestyBannerProps {
  scaffoldId?: string | null
  fusionTransactionId?: string | null
  stateCount?: number
  className?: string
}

export function VideoToMechanicHonestyBanner({
  scaffoldId,
  fusionTransactionId,
  stateCount,
  className,
}: VideoToMechanicHonestyBannerProps) {
  return (
    <div
      className={
        className ??
        'mx-4 mb-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2'
      }
      role="status"
      data-aethel-j6="video-to-mechanic-honesty"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-warning-light)]">
        {VIDEO_TO_MECHANIC_HONESTY.productLabel}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">
        {VIDEO_TO_MECHANIC_HONESTY.notPlayableAaa} {VIDEO_TO_MECHANIC_HONESTY.userWiringRequired}
      </p>
      {(scaffoldId || fusionTransactionId || typeof stateCount === 'number') && (
        <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          {scaffoldId ? `scaffold:${scaffoldId}` : null}
          {scaffoldId && fusionTransactionId ? ' · ' : null}
          {fusionTransactionId ? `tx:${fusionTransactionId}` : null}
          {typeof stateCount === 'number' ? ` · states:${stateCount}` : null}
        </p>
      )}
    </div>
  )
}
