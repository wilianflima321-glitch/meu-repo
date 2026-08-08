'use client'

/**
 * AI-v1-e / J.7 — USD / character content honesty strip.
 */

import {
  USD_BROWSER_FORMAT_SUPPORT,
  USD_BROWSER_VIEWER_SHIP_STATUS,
  USD_INTEGRATOR_HONESTY,
} from '@/lib/production/usd-integrator'

interface UsdContentHonestyBannerProps {
  placementCount?: number
  fusionTransactionId?: string | null
  blockedReason?: string | null
  className?: string
}

export function UsdContentHonestyBanner({
  placementCount,
  fusionTransactionId,
  blockedReason,
  className,
}: UsdContentHonestyBannerProps) {
  const matrix = [
    `USDZ [${USD_BROWSER_FORMAT_SUPPORT.usdz.shipStatus}]`,
    `USDA [${USD_BROWSER_FORMAT_SUPPORT.usda.shipStatus}]`,
    `USD [${USD_BROWSER_FORMAT_SUPPORT.usd.shipStatus}]`,
    `USDC [${USD_BROWSER_FORMAT_SUPPORT.usdc.shipStatus}]`,
  ].join(' · ')

  return (
    <div
      className={
        className ??
        'mx-4 mb-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-text-tertiary)_8%,transparent)] px-3 py-2'
      }
      role="status"
      data-aethel-j7="usd-content-honesty"
      data-aethel-j7-viewer={USD_BROWSER_VIEWER_SHIP_STATUS}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
        UsdIntegrator · viewer [{USD_BROWSER_VIEWER_SHIP_STATUS}]
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">
        {blockedReason
          ? blockedReason
          : `${USD_INTEGRATOR_HONESTY.noProxyCapsule} ${USD_INTEGRATOR_HONESTY.usdzPreviewPartial}`}
      </p>
      <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">{matrix}</p>
      {(typeof placementCount === 'number' || fusionTransactionId) && (
        <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          {typeof placementCount === 'number' ? `placements:${placementCount}` : null}
          {typeof placementCount === 'number' && fusionTransactionId ? ' · ' : null}
          {fusionTransactionId ? `tx:${fusionTransactionId}` : null}
        </p>
      )}
    </div>
  )
}
